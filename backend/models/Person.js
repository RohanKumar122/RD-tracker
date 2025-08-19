const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  month: {
    type: String, // Format: "YYYY-MM"
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'paid'
  }
});

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: false, // Email is optional for now
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ]
  },
  amount: {
    type: Number,
    required: [true, 'RD amount is required'],
    min: [1, 'Amount must be greater than 0']
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'partial'],
    default: 'pending'
  },
  lastPayment: {
    type: Date,
    default: null
  },
  totalContributed: {
    type: Number,
    default: 0
  },
  paymentHistory: [paymentHistorySchema],
  currentMonth: {
    type: String, // Format: "YYYY-MM"
    default: () => new Date().toISOString().slice(0, 7)
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
personSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
personSchema.index({ userId: 1, email: 1 });
personSchema.index({ userId: 1, status: 1 });
personSchema.index({ userId: 1, currentMonth: 1 });

// Method to add payment
personSchema.methods.addPayment = function(amount, notes = '') {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  this.paymentHistory.push({
    amount,
    month: currentMonth,
    notes,
    status: amount >= this.amount ? 'paid' : 'partial'
  });
  
  this.totalContributed += amount;
  this.lastPayment = new Date();
  
  // Update status based on payment
  if (amount >= this.amount) {
    this.status = 'paid';
  } else {
    this.status = 'partial';
  }
  
  this.currentMonth = currentMonth;
  return this.save();
};

// Method to get monthly status
personSchema.methods.getMonthlyStatus = function(month) {
  const payment = this.paymentHistory.find(p => p.month === month);
  return payment ? payment.status : 'pending';
};

// Static method to get all people for a user
personSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isActive: true });
};

// Static method to get pending payments for current month
personSchema.statics.getPendingForMonth = function(userId, month) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  return this.find({
    userId,
    isActive: true,
    $or: [
      { status: 'pending' },
      { status: 'partial' },
      { currentMonth: { $ne: currentMonth } }
    ]
  });
};

module.exports = mongoose.model('Person', personSchema);