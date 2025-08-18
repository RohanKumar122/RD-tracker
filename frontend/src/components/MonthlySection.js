
import { 
  Calendar, 
  AlertCircle
} from 'lucide-react';

const MonthlySection = ({ people, stats, togglePaymentStatus }) => {
  const currentDate = new Date();
  const isAfter15th = currentDate.getDate() >= 15;
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Monthly Tracking</h2>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Current Month</p>
          <p className="text-white font-semibold">{currentMonth}</p>
        </div>
      </div>
      
      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Expected</p>
          <p className="text-xl font-bold text-white">₹{stats.totalAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Collected</p>
          <p className="text-xl font-bold text-green-500">₹{stats.collectedAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-xl font-bold text-red-500">₹{stats.pendingAmount || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Collection Rate</p>
          <p className="text-xl font-bold text-purple-500">{stats.collectionRate || 0}%</p>
        </div>
      </div>

      {isAfter15th && stats.overdueCount > 0 && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-300" />
            <div>
              <p className="text-red-200 font-semibold">RD Collection Due - 15th of the month has passed!</p>
              <p className="text-red-300">{stats.overdueCount} people have overdue payments</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid gap-4">
        {people.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No people to track</p>
          </div>
        ) : (
          people.map(person => (
            <div key={person._id} className={`bg-gray-800 rounded-xl p-6 border ${
              person.status === 'pending' && isAfter15th ? 'border-red-500' : 'border-gray-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{person.name}</h3>
                  <p className="text-gray-400">Expected: ₹{person.amount}</p>
                  <p className="text-gray-400">Total Contributed: ₹{person.totalContributed || 0}</p>
                  <p className="text-gray-400">
                    Last Payment: {person.lastPayment ? new Date(person.lastPayment).toLocaleDateString() : 'Never'}
                  </p>
                  {person.status === 'pending' && isAfter15th && (
                    <p className="text-red-400 text-sm font-medium">⚠️ Overdue</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-lg font-semibold ${
                    person.status === 'paid' ? 'bg-green-600 text-white' : 
                    person.status === 'partial' ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {person.status === 'paid' ? 'Paid' : person.status === 'partial' ? 'Partial' : 'Pending'}
                  </span>
                  
                  <button
                    onClick={() => togglePaymentStatus(person._id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      person.status === 'paid' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Mark as {person.status === 'paid' ? 'Pending' : 'Paid'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MonthlySection;