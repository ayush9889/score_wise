import React, { useState, useEffect } from 'react';
import { Play, Users, Trophy, Sparkles, Target, Clock, ChevronDown, Search, History, Plus } from 'lucide-react';
import { Match, Team, MatchFormat, MATCH_FORMATS, Player } from '../types/cricket';
import { InningsSetupModal } from './InningsSetupModal';
import { storageService } from '../services/storage';

interface MatchSetupProps {
  onMatchStart: (match: Match) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ onMatchStart }) => {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2' | ''>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>(MATCH_FORMATS[0]);
  const [customOvers, setCustomOvers] = useState(15);
  const [showInningsSetup, setShowInningsSetup] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  
  // Team suggestions state
  const [teamSuggestions, setTeamSuggestions] = useState<string[]>([]);
  const [showTeam1Suggestions, setShowTeam1Suggestions] = useState(false);
  const [showTeam2Suggestions, setShowTeam2Suggestions] = useState(false);
  const [filteredTeam1Suggestions, setFilteredTeam1Suggestions] = useState<string[]>([]);
  const [filteredTeam2Suggestions, setFilteredTeam2Suggestions] = useState<string[]>([]);

  const canStartMatch = team1Name.trim() && team2Name.trim() && tossWinner && tossDecision;

  // Load team suggestions from match history
  useEffect(() => {
    const loadTeamSuggestions = async () => {
      try {
        const matches = await storageService.getAllMatches();
        const teamNames = new Set<string>();
        
        matches.forEach(match => {
          if (match.team1.name) teamNames.add(match.team1.name);
          if (match.team2.name) teamNames.add(match.team2.name);
        });
        
        const sortedTeams = Array.from(teamNames).sort((a, b) => {
          // Sort by frequency (most used first)
          const aCount = matches.filter(m => m.team1.name === a || m.team2.name === a).length;
          const bCount = matches.filter(m => m.team1.name === b || m.team2.name === b).length;
          return bCount - aCount;
        });
        
        setTeamSuggestions(sortedTeams);
      } catch (error) {
        console.error('Failed to load team suggestions:', error);
      }
    };
    
    loadTeamSuggestions();
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    const filter1 = teamSuggestions.filter(name => 
      name.toLowerCase().includes(team1Name.toLowerCase()) && 
      name !== team1Name
    );
    setFilteredTeam1Suggestions(filter1.slice(0, 5));
  }, [team1Name, teamSuggestions]);

  useEffect(() => {
    const filter2 = teamSuggestions.filter(name => 
      name.toLowerCase().includes(team2Name.toLowerCase()) && 
      name !== team2Name
    );
    setFilteredTeam2Suggestions(filter2.slice(0, 5));
  }, [team2Name, teamSuggestions]);

  const handleCreateMatch = () => {
    if (!canStartMatch) return;

    const overs = selectedFormat.name === 'Custom' ? customOvers : selectedFormat.overs;

    const team1: Team = {
      name: team1Name.trim(),
      players: [],
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 }
    };

    const team2: Team = {
      name: team2Name.trim(),
      players: [],
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 }
    };

    const battingFirst = (tossWinner === 'team1' && tossDecision === 'bat') || 
                        (tossWinner === 'team2' && tossDecision === 'bowl');

    const newMatch: Match = {
      id: `match_${Date.now()}`,
      team1,
      team2,
      tossWinner: tossWinner === 'team1' ? team1Name : team2Name,
      tossDecision,
      currentInnings: 1,
      battingTeam: battingFirst ? team1 : team2,
      bowlingTeam: battingFirst ? team2 : team1,
      totalOvers: overs,
      balls: [],
      isCompleted: false,
      isSecondInnings: false,
      startTime: Date.now()
    };

    setMatch(newMatch);
    setShowInningsSetup(true);
  };

  const handleInningsSetup = (striker: Player, nonStriker: Player, bowler: Player) => {
    if (!match) return;

    const updatedMatch = { ...match };
    updatedMatch.currentStriker = striker;
    updatedMatch.currentNonStriker = nonStriker;
    updatedMatch.currentBowler = bowler;

    // Add players to their respective teams
    if (!updatedMatch.battingTeam.players.find(p => p.id === striker.id)) {
      updatedMatch.battingTeam.players.push(striker);
    }
    if (!updatedMatch.battingTeam.players.find(p => p.id === nonStriker.id)) {
      updatedMatch.battingTeam.players.push(nonStriker);
    }
    if (!updatedMatch.bowlingTeam.players.find(p => p.id === bowler.id)) {
      updatedMatch.bowlingTeam.players.push(bowler);
    }

    setShowInningsSetup(false);
    onMatchStart(updatedMatch);
  };

  const selectTeamSuggestion = (teamNumber: 1 | 2, name: string) => {
    if (teamNumber === 1) {
      setTeam1Name(name);
      setShowTeam1Suggestions(false);
    } else {
      setTeam2Name(name);
      setShowTeam2Suggestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">Match Setup</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Setup Your
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Match</span>
            </h1>
            
            <p className="text-xl text-purple-200">Configure teams, format & toss in seconds</p>
          </div>

          <div className="space-y-8">
            {/* Team Names Section */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Team Names</h2>
                <p className="text-purple-200">Enter team names or select from history</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Team 1 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-purple-200 mb-3">
                    <Users className="w-4 h-4 inline mr-2" />
                    Team 1 Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={team1Name}
                      onChange={(e) => {
                        setTeam1Name(e.target.value);
                        setShowTeam1Suggestions(true);
                      }}
                      onFocus={() => setShowTeam1Suggestions(true)}
                      className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter team name"
                    />
                    <button
                      onClick={() => setShowTeam1Suggestions(!showTeam1Suggestions)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${showTeam1Suggestions ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Team 1 Suggestions */}
                  {showTeam1Suggestions && filteredTeam1Suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                      {filteredTeam1Suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectTeamSuggestion(1, suggestion)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                        >
                          <History className="w-4 h-4 text-purple-300" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team 2 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-purple-200 mb-3">
                    <Users className="w-4 h-4 inline mr-2" />
                    Team 2 Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={team2Name}
                      onChange={(e) => {
                        setTeam2Name(e.target.value);
                        setShowTeam2Suggestions(true);
                      }}
                      onFocus={() => setShowTeam2Suggestions(true)}
                      className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter team name"
                    />
                    <button
                      onClick={() => setShowTeam2Suggestions(!showTeam2Suggestions)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${showTeam2Suggestions ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Team 2 Suggestions */}
                  {showTeam2Suggestions && filteredTeam2Suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                      {filteredTeam2Suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectTeamSuggestion(2, suggestion)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                        >
                          <History className="w-4 h-4 text-purple-300" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Match Format Section */}
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Match Format</h2>
                <p className="text-purple-200">Choose your preferred format</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {MATCH_FORMATS.map((format) => (
                  <button
                    key={format.name}
                    onClick={() => setSelectedFormat(format)}
                    className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                      selectedFormat.name === format.name
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/20 bg-white/5 text-purple-200 hover:border-purple-400/50 hover:bg-white/10'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="font-bold text-lg mb-2">{format.name}</div>
                      {format.overs > 0 && (
                        <div className="flex items-center justify-center space-x-1 text-sm opacity-80">
                          <Clock className="w-4 h-4" />
                          <span>{format.overs} overs</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedFormat.name === 'Custom' && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <label className="block text-sm font-medium text-purple-200 mb-3">Custom Overs</label>
                  <input
                    type="number"
                    value={customOvers}
                    onChange={(e) => setCustomOvers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Number of overs"
                    min="1"
                    max="50"
                  />
                </div>
              )}
            </div>

            {/* Toss Section */}
            {team1Name && team2Name && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Toss</h2>
                  <p className="text-purple-200">Who won the toss and what did they choose?</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Toss Winner */}
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-3">Toss Winner</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTossWinner('team1')}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                          tossWinner === 'team1'
                            ? 'border-green-500 bg-green-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-purple-200 hover:border-green-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 font-medium">{team1Name}</div>
                      </button>
                      <button
                        onClick={() => setTossWinner('team2')}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                          tossWinner === 'team2'
                            ? 'border-green-500 bg-green-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-purple-200 hover:border-green-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 font-medium">{team2Name}</div>
                      </button>
                    </div>
                  </div>

                  {/* Toss Decision */}
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-3">Toss Decision</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTossDecision('bat')}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                          tossDecision === 'bat'
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-purple-200 hover:border-blue-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 font-medium">Bat First</div>
                      </button>
                      <button
                        onClick={() => setTossDecision('bowl')}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                          tossDecision === 'bowl'
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-purple-200 hover:border-blue-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 font-medium">Bowl First</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Start Match Button */}
            <button
              onClick={handleCreateMatch}
              disabled={!canStartMatch}
              className={`w-full py-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                canStartMatch
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:scale-105 text-white'
                  : 'bg-white/10 text-purple-300 cursor-not-allowed'
              }`}
            >
              <Play className="w-6 h-6 inline mr-3" />
              Setup Players & Start Match
            </button>
          </div>
        </div>
      </div>

      {/* Innings Setup Modal */}
      {match && (
        <InningsSetupModal
          match={match}
          isOpen={showInningsSetup}
          onClose={() => setShowInningsSetup(false)}
          onSetupComplete={handleInningsSetup}
          isSecondInnings={false}
        />
      )}
    </div>
  );
};