
import { 

  Phone, 
  Edit, 
  Trash2, 
  Check, 
  X,

} from 'lucide-react';


const PersonCard = ({ person, onCall, onEdit, onDelete, onToggleStatus }) => {
  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-white">{person.name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              person.status === 'paid' ? 'bg-green-600 text-white' : 
              person.status === 'partial' ? 'bg-yellow-600 text-white' : 
              'bg-red-600 text-white'
            }`}>
              {person.status === 'paid' ? 'Paid' : person.status === 'partial' ? 'Partial' : 'Pending'}
            </span>
          </div>
          <p className="text-gray-400">{person.email}</p>
          <p className="text-gray-400">{person.phone}</p>
          <p className="text-purple-400 font-semibold">₹{person.amount}</p>
          <p className="text-gray-500 text-sm">Last Payment: {formatDate(person.lastPayment)}</p>
          <p className="text-gray-500 text-sm">Total Contributed: ₹{person.totalContributed || 0}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCall}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
            title="Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-colors ${
              person.status === 'paid' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
            title={person.status === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
          >
            {person.status === 'paid' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          </button>
          
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonCard;