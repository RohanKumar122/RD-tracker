const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Person = require('../models/Person');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/people
 * @desc    Get all people for authenticated user
 * @access  Private
 */
router.get(
  '/',
  [
    query('search').optional().trim(),
    query('status').optional().isIn(['paid', 'pending', 'partial']),
    query('month').optional().matches(/^\d{4}-\d{2}$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Invalid query parameters',
          errors: errors.array(),
        });
      }

      const { search, status, month } = req.query;
      const userId = req.user.id;

      // Build query
      let queryObj = { userId, isActive: true };

      if (status) queryObj.status = status;
      if (month) queryObj.currentMonth = month;

      // Fetch people
      let people = await Person.find(queryObj).sort({ updatedAt: -1 });

      // Apply search filter
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        people = people.filter(
          (person) =>
            searchRegex.test(person.name) ||
            searchRegex.test(person.email) ||
            searchRegex.test(person.phone)
        );
      }

      res.json({ success: true, count: people.length, data: people });
    } catch (error) {
      console.error('Get people error:', error);
      res.status(500).json({ message: 'Server error while fetching people' });
    }
  }
);

/**
 * @route   GET /api/people/:id
 * @desc    Get single person by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const person = await Person.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true,
    });

    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }

    res.json({ success: true, data: person });
  } catch (error) {
    console.error('Get person error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid person ID' });
    }
    res.status(500).json({ message: 'Server error while fetching person' });
  }
});

/**
 * @route   POST /api/people
 * @desc    Create new person
 * @access  Private
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('phone')
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please enter a valid phone number'),
    body('amount')
      .isNumeric()
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, email, phone, amount, notes } = req.body;
      const userId = req.user.id;

      // Check for duplicate email
      const existingPerson = await Person.findOne({ userId, email, isActive: true });
      if (existingPerson) {
        return res.status(400).json({ message: 'Person with this email already exists' });
      }

      // Create new person
      const person = new Person({
        name,
        email,
        phone,
        amount: parseFloat(amount),
        notes,
        userId,
      });

      await person.save();
      res.status(201).json({
        success: true,
        message: 'Person created successfully',
        data: person,
      });
    } catch (error) {
      console.error('Create person error:', error);
      res.status(500).json({ message: 'Server error while creating person' });
    }
  }
);


/**
 * @route   PUT /api/people/:id
 * @desc    Update person
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please enter a valid phone number'),
    body('amount')
      .optional()
      .isNumeric()
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, email, phone, amount, notes } = req.body;
      const userId = req.user.id;
      const personId = req.params.id;

      // Check if person exists
      const person = await Person.findOne({ _id: personId, userId, isActive: true });
      if (!person) {
        return res.status(404).json({ message: 'Person not found' });
      }

      // Ensure email is unique if changed
      if (email && email !== person.email) {
        const existingPerson = await Person.findOne({
          userId,
          email,
          isActive: true,
          _id: { $ne: personId },
        });

        if (existingPerson) {
          return res.status(400).json({ message: 'Email is already taken by another person' });
        }
      }

      // Update person
      const updatedPerson = await Person.findByIdAndUpdate(
        personId,
        {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(amount && { amount: parseFloat(amount) }),
          ...(notes !== undefined && { notes }),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Person updated successfully',
        data: updatedPerson,
      });
    } catch (error) {
      console.error('Update person error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid person ID' });
      }
      res.status(500).json({ message: 'Server error while updating person' });
    }
  }
);

// @route   DELETE /api/people/:id
// @desc    Delete person (soft delete)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const person = await Person.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!person) {
      return res.status(404).json({
        message: 'Person not found'
      });
    }

    // Soft delete by setting isActive to false
    person.isActive = false;
    await person.save();

    res.json({
      success: true,
      message: 'Person deleted successfully'
    });

  } catch (error) {
    console.error('Delete person error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid person ID'
      });
    }
    res.status(500).json({
      message: 'Server error while deleting person'
    });
  }
});

// @route   POST /api/people/:id/payment
// @desc    Add payment for person
// @access  Private
router.post('/:id/payment', [
  body('amount')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('month')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Month must be in YYYY-MM format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, notes, month } = req.body;
    const userId = req.user.id;
    const personId = req.params.id;

    // Find person
    const person = await Person.findOne({
      _id: personId,
      userId,
      isActive: true
    });

    if (!person) {
      return res.status(404).json({
        message: 'Person not found'
      });
    }

    // Add payment
    await person.addPayment(parseFloat(amount), notes || '');

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: person
    });

  } catch (error) {
    console.error('Add payment error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid person ID'
      });
    }
    res.status(500).json({
      message: 'Server error while adding payment'
    });
  }
});

// @route   PUT /api/people/:id/status
// @desc    Update payment status
// @access  Private
router.put('/:id/status', [
  body('status')
    .isIn(['paid', 'pending', 'partial'])
    .withMessage('Status must be paid, pending, or partial'),
  body('month')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Month must be in YYYY-MM format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, month } = req.body;
    const userId = req.user.id;
    const personId = req.params.id;

    // Find person
    const person = await Person.findOne({
      _id: personId,
      userId,
      isActive: true
    });

    if (!person) {
      return res.status(404).json({
        message: 'Person not found'
      });
    }

    // Update status
    person.status = status;
    
    if (status === 'paid') {
      person.lastPayment = new Date();
      if (!month) {
        person.currentMonth = new Date().toISOString().slice(0, 7);
      }
    }

    await person.save();

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: person
    });

  } catch (error) {
    console.error('Update status error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid person ID'
      });
    }
    res.status(500).json({
      message: 'Server error while updating status'
    });
  }
});

// @route   GET /api/people/:id/payments
// @desc    Get payment history for person
// @access  Private
router.get('/:id/payments', async (req, res) => {
  try {
    const person = await Person.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!person) {
      return res.status(404).json({
        message: 'Person not found'
      });
    }

    res.json({
      success: true,
      data: {
        paymentHistory: person.paymentHistory,
        totalContributed: person.totalContributed,
        person: {
          name: person.name,
          email: person.email,
          amount: person.amount
        }
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid person ID'
      });
    }
    res.status(500).json({
      message: 'Server error while fetching payments'
    });
  }
});

// @route   GET /api/people/pending/current-month
// @desc    Get people with pending payments for current month
// @access  Private
router.get('/pending/current-month', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pendingPeople = await Person.getPendingForMonth(userId, currentMonth);

    res.json({
      success: true,
      count: pendingPeople.length,
      data: pendingPeople,
      month: currentMonth
    });

  } catch (error) {
    console.error('Get pending people error:', error);
    res.status(500).json({
      message: 'Server error while fetching pending people'
    });
  }
});

module.exports = router;