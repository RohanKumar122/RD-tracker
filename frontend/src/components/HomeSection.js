import { 
  Users, 
  Phone, 
  Check, 
  X,
  IndianRupee ,
  AlertCircle
} from 'lucide-react';

const HomeSection = ({ stats, people, makeCall, togglePaymentStatus }) => {
  const pendingPeople = people.filter(p => p.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Total People</p>
              <p className="text-xl lg:text-2xl font-bold text-white">{stats.totalPeople || 0}</p>
            </div>
            <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Paid This Month</p>
              <p className="text-xl lg:text-2xl font-bold text-green-500">{stats.paidCount || 0}</p>
            </div>
            <Check className="w-6 h-6 lg:w-8 lg:h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Pending</p>
              <p className="text-xl lg:text-2xl font-bold text-red-500">{stats.pendingCount || 0}</p>
            </div>
            <X className="w-6 h-6 lg:w-8 lg:h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs lg:text-sm">Collection Rate</p>
              <p className="text-xl lg:text-2xl font-bold text-purple-500">{stats.collectionRate || 0}%</p>
            </div>
            <IndianRupee className="w-6 h-6 lg:w-8 lg:h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Amount Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Total Expected</h3>
          <p className="text-xl lg:text-2xl font-bold text-blue-400">₹{stats.totalAmount || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Collected</h3>
          <p className="text-xl lg:text-2xl font-bold text-green-400">₹{stats.collectedAmount || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">Pending</h3>
          <p className="text-xl lg:text-2xl font-bold text-red-400">₹{stats.pendingAmount || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      {pendingPeople.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
          <h3 className="text-lg lg:text-xl font-semibold text-white mb-4">Quick Call Actions - Pending Payments</h3>
          <div className="space-y-3">
            {pendingPeople.map(person => (
              <div key={person._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm lg:text-base">{person.name}</p>
                  <p className="text-gray-400 text-xs lg:text-sm">₹{person.amount} pending</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => makeCall(person.phone)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button
                    onClick={() => togglePaymentStatus(person._id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {stats.isAfter15th && stats.overdueCount > 0 && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-4 lg:p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-red-200">Overdue Payments Alert</h3>
              <p className="text-red-300 text-sm lg:text-base">
                {stats.overdueCount} people have overdue payments (after 15th of the month)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeSection;