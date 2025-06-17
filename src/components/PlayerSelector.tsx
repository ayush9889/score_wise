import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, User, Camera, X, Phone } from 'lucide-react';
import { Player } from '../types/cricket';
import { storageService } from '../services/storage';
import { authService } from '../services/authService';

interface PlayerSelectorProps {
  onPlayerSelect: (player: Player) => void;
  onClose: () => void;
  title: string;
  excludePlayerIds?: string[];
  players: Player[];
  showOnlyAvailable?: boolean;
  allowAddPlayer?: boolean;
  groupId?: string;
}

export const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  onPlayerSelect,
  onClose,
  title,
  excludePlayerIds = [],
  players,
  showOnlyAvailable = false,
  allowAddPlayer = true,
  groupId
}) => {
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>(players);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerShortId, setNewPlayerShortId] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update filtered players when search term or players change
  useEffect(() => {
    console.log(`🔍 FILTERING PLAYERS:`, {
      totalPlayers: players.length,
      excludedIds: excludePlayerIds,
      searchTerm
    });

    let filtered = players.filter(player => {
      const notExcluded = !excludePlayerIds.includes(player.id);
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (player.shortId && player.shortId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      console.log(`Player ${player.name}: excluded=${!notExcluded}, matches=${matchesSearch}`);
      return notExcluded && matchesSearch;
    });

    // Sort players: group members first, then by name
    filtered.sort((a, b) => {
      if (a.isGroupMember && !b.isGroupMember) return -1;
      if (!a.isGroupMember && b.isGroupMember) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ FILTERED RESULT: ${filtered.length} players available:`, filtered.map(p => p.name));
    setFilteredPlayers(filtered);
  }, [players, searchTerm, excludePlayerIds]);

  // Auto-suggest based on first letter
  useEffect(() => {
    if (searchTerm.length === 1) {
      const suggestions = players.filter(player => 
        player.name.toLowerCase().startsWith(searchTerm.toLowerCase()) &&
        !excludePlayerIds.includes(player.id)
      );
      setFilteredPlayers(suggestions);
    }
  }, [searchTerm, players, excludePlayerIds]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const player: Player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPlayerName.trim(),
        shortId: newPlayerShortId.trim() || undefined,
        photoUrl: selectedPhoto || undefined,
        isGroupMember: !!groupId,
        stats: {
          matchesPlayed: 0,
          runsScored: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          highestScore: 0,
          timesOut: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
          runsConceded: 0,
          catches: 0,
          runOuts: 0,
          motmAwards: 0,
          ducks: 0,
          dotBalls: 0,
          maidenOvers: 0,
          bestBowlingFigures: '0/0'
        }
      };

      await storageService.savePlayer(player);
      
      // If we have a group and phone number, try to invite them
      if (groupId && newPlayerPhone.trim()) {
        try {
          await authService.inviteToGroup(groupId, undefined, newPlayerPhone.trim());
        } catch (inviteError) {
          console.warn('Failed to send invitation:', inviteError);
          // Don't fail the player creation if invitation fails
        }
      }

      console.log(`✅ PLAYER CREATED AND SELECTED: ${player.name}`);
      onPlayerSelect(player);
      
      // Reset form
      setNewPlayerName('');
      setNewPlayerShortId('');
      setNewPlayerPhone('');
      setSelectedPhoto(null);
      setShowAddPlayer(false);
      setShowQuickAdd(false);
    } catch (err) {
      setError('Failed to add player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const player: Player = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPlayerName.trim(),
        isGroupMember: false,
        isGuest: true,
        stats: {
          matchesPlayed: 0,
          runsScored: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          highestScore: 0,
          timesOut: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
          runsConceded: 0,
          catches: 0,
          runOuts: 0,
          motmAwards: 0,
          ducks: 0,
          dotBalls: 0,
          maidenOvers: 0,
          bestBowlingFigures: '0/0'
        }
      };

      await storageService.savePlayer(player);
      console.log(`✅ GUEST PLAYER CREATED AND SELECTED: ${player.name}`);
      onPlayerSelect(player);
      
      // Reset form
      setNewPlayerName('');
      setShowQuickAdd(false);
    } catch (err) {
      setError('Failed to add guest player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (player: Player) => {
    console.log(`🎯 PLAYER SELECTED: ${player.name} (${player.isGuest ? 'Guest' : 'Member'})`);
    onPlayerSelect(player);
  };

  const handleClose = () => {
    console.log('❌ Player selector closed');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Guest Player Quick Add */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <User className="w-4 h-4 mr-2 text-orange-600" />
              Quick Add Guest Player
            </h3>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Guest</span>
          </div>
          
          {showQuickAdd ? (
            <form onSubmit={handleQuickAdd} className="space-y-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Guest player name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading || !newPlayerName.trim()}
                  className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Guest'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-xl hover:bg-orange-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guest Player</span>
            </button>
          )}
          
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredPlayers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No players found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search or add a new player</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors text-left flex items-center space-x-3 group"
                >
                  {/* Player Avatar */}
                  <div className="relative">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        player.isGuest ? 'bg-orange-500' : 'bg-purple-500'
                      }`}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {player.isGuest && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      {player.isGuest && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Guest</span>
                      )}
                      {player.isGroupMember && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Member</span>
                      )}
                    </div>
                    {player.shortId && (
                      <p className="text-sm text-gray-500">ID: {player.shortId}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                      <span>Matches: {player.stats.matchesPlayed}</span>
                      <span>Runs: {player.stats.runsScored}</span>
                      <span>Wickets: {player.stats.wicketsTaken}</span>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-purple-500 transition-colors"></div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Full Player Button */}
        {allowAddPlayer && !showAddPlayer && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowAddPlayer(true)}
              className="w-full bg-purple-500 text-white py-3 px-4 rounded-xl hover:bg-purple-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Full Player</span>
            </button>
          </div>
        )}

        {/* Full Player Add Form */}
        {showAddPlayer && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-purple-600" />
              Add Full Player
            </h3>
            
            <form onSubmit={handleAddPlayer} className="space-y-3">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              
              <input
                type="text"
                value={newPlayerShortId}
                onChange={(e) => setNewPlayerShortId(e.target.value)}
                placeholder="Short ID (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              
              <input
                type="tel"
                value={newPlayerPhone}
                onChange={(e) => setNewPlayerPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              
              {/* Photo Upload */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Photo</span>
                </button>
                {selectedPhoto && (
                  <img src={selectedPhoto} alt="Preview" className="w-8 h-8 rounded-full object-cover" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading || !newPlayerName.trim()}
                  className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Player'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};