import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Award, Users, Download, Upload, User, RefreshCw, BarChart3, Star } from 'lucide-react';
import { Player, Match } from '../types/cricket';
import { storageService } from '../services/storage';
import { PDFService } from '../services/pdfService';

interface GroupDashboardProps {
  onBack: () => void;
}

interface PlayerStats {
  player: Player;
  matches: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  average: number;
  strikeRate: number;
  economy: number;
  bestBowling: string;
  highestScore: number;
  fifties: number;
  hundreds: number;
  motmAwards: number;
}

export const GroupDashboard: React.FC<GroupDashboardProps> = ({ onBack }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding'>('batting');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const storedMatches = await storageService.getMatches();
      const storedPlayers = await storageService.getPlayers();
      
      // Filter matches based on time range
      let filteredMatches = storedMatches;
      if (timeRange !== 'all') {
        const now = new Date();
        const cutoff = new Date();
        if (timeRange === 'month') {
          cutoff.setMonth(now.getMonth() - 1);
        } else {
          cutoff.setDate(now.getDate() - 7);
        }
        filteredMatches = storedMatches.filter(match => new Date(match.startTime) >= cutoff);
      }
      
      setMatches(filteredMatches);
      setPlayers(storedPlayers);
      calculatePlayerStats(filteredMatches, storedPlayers);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = (matches: Match[], players: Player[]) => {
    const stats: PlayerStats[] = players.map(player => {
      const playerMatches = matches.filter(match => 
        match.team1.players.some(p => p.id === player.id) || 
        match.team2.players.some(p => p.id === player.id)
      );

      const battingStats = playerMatches.reduce((acc, match) => {
        const balls = match.balls.filter(b => b.striker.id === player.id);
        const runs = balls.reduce((sum, b) => sum + b.runs, 0);
        const fours = balls.filter(b => b.runs === 4).length;
        const sixes = balls.filter(b => b.runs === 6).length;
        const highestScore = Math.max(...balls.map(b => b.runs), 0);
        
        return {
          runs: acc.runs + runs,
          balls: acc.balls + balls.length,
          fours: acc.fours + fours,
          sixes: acc.sixes + sixes,
          highestScore: Math.max(acc.highestScore, highestScore)
        };
      }, { runs: 0, balls: 0, fours: 0, sixes: 0, highestScore: 0 });

      const bowlingStats = playerMatches.reduce((acc, match) => {
        const balls = match.balls.filter(b => b.bowler.id === player.id);
        const wickets = balls.filter(b => b.isWicket && b.wicketType !== 'run_out').length;
        const runs = balls.reduce((sum, b) => sum + b.runs, 0);
        
        return {
          wickets: acc.wickets + wickets,
          overs: acc.overs + (balls.length / 6),
          runsConceded: acc.runsConceded + runs
        };
      }, { wickets: 0, overs: 0, runsConceded: 0 });

      const fieldingStats = playerMatches.reduce((acc, match) => {
        const catches = match.balls.filter(b => b.wicketFielder?.id === player.id && b.wicketType === 'caught').length;
        const stumpings = match.balls.filter(b => b.wicketFielder?.id === player.id && b.wicketType === 'stumped').length;
        const runOuts = match.balls.filter(b => b.wicketFielder?.id === player.id && b.wicketType === 'run_out').length;
        
        return {
          catches: acc.catches + catches,
          stumpings: acc.stumpings + stumpings,
          runOuts: acc.runOuts + runOuts
        };
      }, { catches: 0, stumpings: 0, runOuts: 0 });

      const average = battingStats.runs / (battingStats.balls || 1);
      const strikeRate = (battingStats.runs / (battingStats.balls || 1)) * 100;
      const economy = bowlingStats.runsConceded / (bowlingStats.overs || 1);

      return {
        player,
        matches: playerMatches.length,
        ...battingStats,
        ...bowlingStats,
        ...fieldingStats,
        average: Number(average.toFixed(2)),
        strikeRate: Number(strikeRate.toFixed(2)),
        economy: Number(economy.toFixed(2)),
        bestBowling: `${bowlingStats.wickets}/${bowlingStats.runsConceded}`,
        fifties: Math.floor(battingStats.runs / 50),
        hundreds: Math.floor(battingStats.runs / 100),
        motmAwards: playerMatches.filter(m => m.manOfTheMatch?.id === player.id).length
      };
    });

    setPlayerStats(stats);
  };

  const handleExportStats = async () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(16);
      doc.text('Group Statistics Report', 14, 15);
      
      // Time Range
      doc.setFontSize(12);
      doc.text(`Period: ${timeRange === 'all' ? 'All Time' : timeRange === 'month' ? 'Last Month' : 'Last Week'}`, 14, 25);
      
      // Batting Stats
      doc.setFontSize(14);
      doc.text('Batting Statistics', 14, 35);
      
      const battingStats = playerStats
        .filter(p => p.balls > 0)
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 10);
      
      const battingTable = battingStats.map(p => [
        p.player.name,
        p.runs.toString(),
        p.balls.toString(),
        p.average.toString(),
        p.strikeRate.toString(),
        p.fifties.toString(),
        p.hundreds.toString()
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['Player', 'Runs', 'Balls', 'Avg', 'SR', '50s', '100s']],
        body: battingTable,
        theme: 'grid'
      });
      
      // Bowling Stats
      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Bowling Statistics', 14, lastY);
      
      const bowlingStats = playerStats
        .filter(p => p.overs > 0)
        .sort((a, b) => b.wickets - a.wickets)
        .slice(0, 10);
      
      const bowlingTable = bowlingStats.map(p => [
        p.player.name,
        p.wickets.toString(),
        p.overs.toFixed(1),
        p.runsConceded.toString(),
        p.economy.toString(),
        p.bestBowling
      ]);
      
      autoTable(doc, {
        startY: lastY + 5,
        head: [['Player', 'Wickets', 'Overs', 'Runs', 'Econ', 'Best']],
        body: bowlingTable,
        theme: 'grid'
      });
      
      // Save the PDF
      doc.save('group-statistics.pdf');
    } catch (error) {
      console.error('Failed to export stats:', error);
      alert('Failed to export statistics. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Group Dashboard</h1>
          <button
            onClick={handleExportStats}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export Statistics"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Time Range Filter */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Last Week
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'batting'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-5 h-5 inline mr-2" />
            Batting
          </button>
          <button
            onClick={() => setActiveTab('bowling')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'bowling'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Target className="w-5 h-5 inline mr-2" />
            Bowling
          </button>
          <button
            onClick={() => setActiveTab('fielding')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'fielding'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Award className="w-5 h-5 inline mr-2" />
            Fielding
          </button>
        </div>

        {/* Statistics Display */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeTab === 'batting' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Batting Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Player</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Matches</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Runs</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Avg</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">SR</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">50s</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">100s</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">HS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {playerStats
                      .filter(p => p.balls > 0)
                      .sort((a, b) => b.runs - a.runs)
                      .map((stat, index) => (
                        <tr key={stat.player.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {stat.player.name}
                            {index < 3 && <Star className="w-4 h-4 text-yellow-500 inline ml-2" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.matches}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.runs}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.average}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.strikeRate}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.fifties}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.hundreds}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.highestScore}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bowling' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bowling Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Player</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Matches</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Wickets</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Overs</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Runs</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Econ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Best</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {playerStats
                      .filter(p => p.overs > 0)
                      .sort((a, b) => b.wickets - a.wickets)
                      .map((stat, index) => (
                        <tr key={stat.player.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {stat.player.name}
                            {index < 3 && <Star className="w-4 h-4 text-yellow-500 inline ml-2" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.matches}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.wickets}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.overs.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.runsConceded}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.economy}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.bestBowling}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fielding' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fielding Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Player</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Matches</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Catches</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Stumpings</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Run Outs</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {playerStats
                      .filter(p => p.catches > 0 || p.stumpings > 0 || p.runOuts > 0)
                      .sort((a, b) => (b.catches + b.stumpings + b.runOuts) - (a.catches + a.stumpings + a.runOuts))
                      .map((stat, index) => (
                        <tr key={stat.player.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {stat.player.name}
                            {index < 3 && <Star className="w-4 h-4 text-yellow-500 inline ml-2" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.matches}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.catches}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.stumpings}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{stat.runOuts}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">
                            {stat.catches + stat.stumpings + stat.runOuts}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 