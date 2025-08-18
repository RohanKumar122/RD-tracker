
import { 
  Users, 
  Plus, 

  Search,

} from 'lucide-react';

import PersonCard from '../components/PersonCard';
import PersonForm from './PersonForm';

const PeopleSection = ({ 
  people, 
  searchTerm, 
  setSearchTerm, 
  showAddForm, 
  setShowAddForm,
  editingPerson,
  setEditingPerson,
  handleAddPerson,
  handleUpdatePerson,
  handleDeletePerson,
  makeCall,
  togglePaymentStatus,
  loading
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">People Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          <span>Add Person</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people..."
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* People List */}
      <div className="grid gap-4">
        {people.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No people found</p>
            <p className="text-gray-500">Add some people to start tracking RD payments</p>
          </div>
        ) : (
          people.map(person => (
            <PersonCard
              key={person._id}
              person={person}
              onCall={() => makeCall(person.phone)}
              onEdit={() => setEditingPerson(person)}
              onDelete={() => handleDeletePerson(person._id)}
              onToggleStatus={() => togglePaymentStatus(person._id)}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingPerson) && (
        <PersonForm
          person={editingPerson}
          onSave={editingPerson ? handleUpdatePerson : handleAddPerson}
          onCancel={() => {
            setShowAddForm(false);
            setEditingPerson(null);
          }}
        />
      )}
    </div>
  );
};

export default PeopleSection;