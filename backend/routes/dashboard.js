const express = require('express');
const Person = require('../models/Person');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDate = new Date();
    const isAfter15th = currentDate.getDate() >= 15;

    // Get all active people for user
    const allPeople = await Person.find({ userId, isActive: true });

    // Calculate statistics
    const stats = {
      totalPeople: allPeople.length,
      paidCount: allPeople.filter(p => p.status === 'paid').length,
      pendingCount: allPeople.filter(p => p.status === 'pending').length,
      partialCount: allPeople.filter(p => p.status === 'partial').length,
      totalAmount: allPeople.reduce((sum, p) => sum + p.amount, 0),
      collectedAmount: allPeople
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      partialAmount: allPeople
        .filter(p => p.status === 'partial')
        .reduce((sum, p) => {
          const currentMonthPayment = p.paymentHistory.find(
            payment => payment.month === currentMonth
          );
          return sum + (currentMonthPayment ? currentMonthPayment.amount : 0);
        }, 0),
      pendingAmount: allPeople
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0),
      collectionRate: 0,
      currentMonth,
      isAfter15th,
      overdueCount: 0
    };

    // Calculate collection rate
    if (stats.totalAmount > 0) {
      stats.collectionRate = Math.round(
        ((stats.collectedAmount + stats.partialAmount) / stats.totalAmount) * 100
      );
    }

    // Calculate overdue (pending after 15th)
    if (isAfter15th) {
      stats.overdueCount = allPeople.filter(p => 
        p.status === 'pending' || 
        (p.status === 'partial' && p.currentMonth !== currentMonth)
      ).length;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent payment activities
// @access  Private
router.get('/recent-activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Get people with recent payment history
    const people = await Person.find({ 
      userId, 
      isActive: true,
      paymentHistory: { $exists: true, $not: { $size: 0 } }
    }).sort({ updatedAt: -1 });

    // Extract and sort recent payments
    const recentActivities = [];
    
    people.forEach(person => {
      person.paymentHistory.forEach(payment => {
        recentActivities.push({
          personId: person._id,
          personName: person.name,
          personEmail: person.email,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          month: payment.month,
          status: payment.status,
          notes: payment.notes
        });
      });
    });

    // Sort by payment date (most recent first) and limit
    recentActivities.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    const limitedActivities = recentActivities.slice(0, limit);

    res.json({
      success: true,
      count: limitedActivities.length,
      data: limitedActivities
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      message: 'Server error while fetching recent activities'
    });
  }
});

// @route   GET /api/dashboard/monthly-summary/:month
// @desc    Get monthly collection summary
// @access  Private
router.get('/monthly-summary/:month?', async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.params.month || new Date().toISOString().slice(0, 7);

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: 'Invalid month format. Use YYYY-MM'
      });
    }

    // Get all people for user
    const people = await Person.find({ userId, isActive: true });

    const summary = {
      month,
      totalPeople: people.length,
      paid: [],
      pending: [],
      partial: [],
      totalExpected: 0,
      totalCollected: 0,
      collectionRate: 0
    };

    people.forEach(person => {
      summary.totalExpected += person.amount;

      // Check if person has payment for this month
      const monthlyPayment = person.paymentHistory.find(p => p.month === month);
      
      if (monthlyPayment) {
        summary.totalCollected += monthlyPayment.amount;
        
        if (monthlyPayment.status === 'paid') {
          summary.paid.push({
            id: person._id,
            name: person.name,
            email: person.email,
            amount: person.amount,
            paidAmount: monthlyPayment.amount,
            paymentDate: monthlyPayment.paymentDate,
            notes: monthlyPayment.notes
          });
        } else if (monthlyPayment.status === 'partial') {
          summary.partial.push({
            id: person._id,
            name: person.name,
            email: person.email,
            expectedAmount: person.amount,
            paidAmount: monthlyPayment.amount,
            pendingAmount: person.amount - monthlyPayment.amount,
            paymentDate: monthlyPayment.paymentDate,
            notes: monthlyPayment.notes
          });
        }
      } else {
        // No payment for this month
        summary.pending.push({
          id: person._id,
          name: person.name,
          email: person.email,
          phone: person.phone,
          amount: person.amount,
          lastPayment: person.lastPayment
        });
      }
    });

    // Calculate collection rate
    if (summary.totalExpected > 0) {
      summary.collectionRate = Math.round(
        (summary.totalCollected / summary.totalExpected) * 100
      );
    }

    // Add counts
    summary.paidCount = summary.paid.length;
    summary.pendingCount = summary.pending.length;
    summary.partialCount = summary.partial.length;

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({
      message: 'Server error while fetching monthly summary'
    });
  }
});

// @route   GET /api/dashboard/overdue
// @desc    Get overdue payments (after 15th of month)
// @access  Private
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);
    const isAfter15th = currentDate.getDate() >= 15;

    if (!isAfter15th) {
      return res.json({
        success: true,
        message: 'Not past due date yet',
        data: [],
        count: 0,
        isAfter15th: false
      });
    }

    // Get overdue people
    const overduePeople = await Person.find({
      userId,
      isActive: true,
      $or: [
        { status: 'pending' },
        { 
          status: 'partial',
          currentMonth: { $ne: currentMonth }
        }
      ]
    }).sort({ name: 1 });

    // Format overdue data
    const overdueData = overduePeople.map(person => {
      const daysSinceLastPayment = person.lastPayment 
        ? Math.floor((currentDate - new Date(person.lastPayment)) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: person._id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        amount: person.amount,
        status: person.status,
        lastPayment: person.lastPayment,
        daysSinceLastPayment,
        totalContributed: person.totalContributed
      };
    });

    res.json({
      success: true,
      data: overdueData,
      count: overdueData.length,
      isAfter15th: true,
      currentDate: currentDate.toISOString()
    });

  } catch (error) {
    console.error('Get overdue error:', error);
    res.status(500).json({
      message: 'Server error while fetching overdue payments'
    });
  }
});

// @route   GET /api/dashboard/trends
// @desc    Get collection trends for last 6 months
// @access  Private
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const trends = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.toISOString().slice(0, 7);
      
      trends.push({
        month,
        monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalExpected: 0,
        totalCollected: 0,
        collectionRate: 0,
        paidCount: 0,
        pendingCount: 0,
        partialCount: 0
      });
    }

    // Get all people for user
    const people = await Person.find({ userId, isActive: true });

    // Calculate trends for each month
    trends.forEach(trend => {
      people.forEach(person => {
        trend.totalExpected += person.amount;

        // Find payment for this month
        const monthlyPayment = person.paymentHistory.find(p => p.month === trend.month);
        
        if (monthlyPayment) {
          trend.totalCollected += monthlyPayment.amount;
          
          if (monthlyPayment.status === 'paid') {
            trend.paidCount++;
          } else if (monthlyPayment.status === 'partial') {
            trend.partialCount++;
          }
        } else {
          trend.pendingCount++;
        }
      });

      // Calculate collection rate
      if (trend.totalExpected > 0) {
        trend.collectionRate = Math.round(
          (trend.totalCollected / trend.totalExpected) * 100
        );
      }
    });

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      message: 'Server error while fetching collection trends'
    });
  }
});

module.exports = router;