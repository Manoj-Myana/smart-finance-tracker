import React, { useState, useEffect } from 'react';
import { Flame, Calendar, Trophy, Target, TrendingUp, CheckCircle } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  streakType: string;
  lastActivity: Date;
}

interface DailyGoal {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  color: string;
}

const Streak: React.FC = () => {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 15,
    longestStreak: 23,
    totalDays: 45,
    streakType: 'Financial Tracking',
    lastActivity: new Date()
  });

  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([
    {
      id: 1,
      title: 'Log Daily Expenses',
      description: 'Record at least one transaction today',
      completed: true,
      icon: <TrendingUp className="h-5 w-5" />,
      color: '#3b82f6'
    },
    {
      id: 2,
      title: 'Check Budget Status',
      description: 'Review your budget progress',
      completed: true,
      icon: <Target className="h-5 w-5" />,
      color: '#8b5cf6'
    },
    {
      id: 3,
      title: 'Review AI Suggestions',
      description: 'Check personalized financial insights',
      completed: false,
      icon: <Trophy className="h-5 w-5" />,
      color: '#f97316'
    },
    {
      id: 4,
      title: 'Set Financial Goal',
      description: 'Update or create a new savings goal',
      completed: false,
      icon: <Calendar className="h-5 w-5" />,
      color: '#10b981'
    }
  ]);

  const toggleGoal = (id: number) => {
    setDailyGoals(prev => 
      prev.map(goal => 
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const completedGoals = dailyGoals.filter(goal => goal.completed).length;
  const progressPercentage = (completedGoals / dailyGoals.length) * 100;

  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { level: 'Expert', color: '#dc2626', emoji: '🔥' };
    if (streak >= 20) return { level: 'Advanced', color: '#ea580c', emoji: '⚡' };
    if (streak >= 10) return { level: 'Intermediate', color: '#d97706', emoji: '🌟' };
    if (streak >= 5) return { level: 'Beginner', color: '#65a30d', emoji: '🌱' };
    return { level: 'Starter', color: '#6b7280', emoji: '🎯' };
  };

  const currentLevel = getStreakLevel(streakData.currentStreak);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
              <Flame className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Financial Streak
          </h1>
          <p className="text-gray-600 mt-2">
            Keep your financial habits consistent and build lasting wealth
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Streak Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Streak Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div 
                    className="p-4 rounded-2xl shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${currentLevel.color}20 0%, ${currentLevel.color}10 100%)`,
                      border: `2px solid ${currentLevel.color}30`
                    }}
                  >
                    <span className="text-4xl">{currentLevel.emoji}</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-5xl font-bold text-gray-800 mb-2">
                    {streakData.currentStreak}
                  </div>
                  <div className="text-lg text-gray-600">Days Current Streak</div>
                  <div 
                    className="text-sm font-semibold px-3 py-1 rounded-full inline-block mt-2"
                    style={{ 
                      background: `${currentLevel.color}20`,
                      color: currentLevel.color
                    }}
                  >
                    {currentLevel.level} Level
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{streakData.longestStreak}</div>
                    <div className="text-sm text-gray-600">Longest Streak</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600">{streakData.totalDays}</div>
                    <div className="text-sm text-gray-600">Total Active Days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Goals Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Today's Goals</h3>
                <div className="text-sm text-gray-600">
                  {completedGoals}/{dailyGoals.length} completed
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Daily Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #f97316 100%)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Goals List */}
              <div className="space-y-3">
                {dailyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-102 ${
                      goal.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div 
                        className={`p-2 rounded-lg ${
                          goal.completed ? 'bg-green-100' : 'bg-white'
                        }`}
                        style={{ color: goal.color }}
                      >
                        {goal.completed ? <CheckCircle className="h-5 w-5 text-green-600" /> : goal.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${goal.completed ? 'text-green-800' : 'text-gray-800'}`}>
                          {goal.title}
                        </h4>
                        <p className={`text-sm ${goal.completed ? 'text-green-600' : 'text-gray-600'}`}>
                          {goal.description}
                        </p>
                      </div>
                      {goal.completed && (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Streak Tips */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Streak Tips
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="font-medium text-blue-800 text-sm">Daily Consistency</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Log at least one transaction every day to maintain your streak
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="font-medium text-purple-800 text-sm">Weekend Habit</div>
                  <div className="text-xs text-purple-600 mt-1">
                    Don't break the chain on weekends - keep tracking your expenses
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <div className="font-medium text-orange-800 text-sm">Goal Setting</div>
                  <div className="text-xs text-orange-600 mt-1">
                    Review and update your financial goals weekly
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Achievements</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-xs font-medium text-gray-700">First Week</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="text-2xl mb-1">💎</div>
                  <div className="text-xs font-medium text-gray-700">Two Weeks</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl opacity-50">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-xs font-medium text-gray-700">One Month</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl opacity-50">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-xs font-medium text-gray-700">Three Months</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">This Month</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Transactions Logged</span>
                  <span className="font-semibold text-gray-800">247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Budget Checks</span>
                  <span className="font-semibold text-gray-800">18</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Goals Updated</span>
                  <span className="font-semibold text-gray-800">5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Reports Generated</span>
                  <span className="font-semibold text-gray-800">3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streak;