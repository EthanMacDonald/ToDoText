import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

interface GoalsItem {
  id: number;
  text: string;
  completed: boolean;
  line_number: number;
  is_area_header?: boolean;
  area?: string;
  indent_level?: number;
  quantity?: string;
  metadata?: Record<string, string>;
}

interface GoalsData {
  name: string;
  title: string;
  items: GoalsItem[];
  total_items: number;
  completed_items: number;
  completion_percentage: number;
}

interface Props {
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
  selectedGoals?: string;
  onSelectedGoalsChange?: (goalsName: string) => void;
  isStateLoaded?: boolean;
}

function Goals({ isExpanded: externalIsExpanded, onToggleExpanded, selectedGoals: externalSelectedGoals, onSelectedGoalsChange, isStateLoaded }: Props) {
  const [availableGoals, setAvailableGoals] = useState<string[]>([]);
  const [internalSelectedGoals, setInternalSelectedGoals] = useState<string>('');
  const selectedGoals = externalSelectedGoals !== undefined ? externalSelectedGoals : internalSelectedGoals;
  const [goalsData, setGoalsData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const [showCompleted, setShowCompleted] = useState(true);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    if (onToggleExpanded) {
      onToggleExpanded(newExpanded);
    } else {
      setInternalIsExpanded(newExpanded);
    }
  };

  // Fetch available goals on component mount
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch(`${API_URL}/goals`);
        const goals = await response.json();
        const goalsNames = goals.map((goal: any) => goal.name);
        setAvailableGoals(goalsNames);
        
        if (isStateLoaded && goalsNames.length > 0) {
          if (selectedGoals && goalsNames.includes(selectedGoals)) {
            return;
          }
          
          if (!selectedGoals || !goalsNames.includes(selectedGoals)) {
            const defaultGoals = goalsNames[0];
            if (onSelectedGoalsChange) {
              onSelectedGoalsChange(defaultGoals);
            } else {
              setInternalSelectedGoals(defaultGoals);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
      }
    };
    
    fetchGoals();
  }, [isStateLoaded, selectedGoals, onSelectedGoalsChange]);

  // Fetch goals data when selected goals changes
  useEffect(() => {
    if (selectedGoals) {
      fetchGoalsData();
    }
  }, [selectedGoals]);

  const fetchGoalsData = async () => {
    if (!selectedGoals) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/goals/${selectedGoals}`);
      const data = await response.json();
      setGoalsData(data);
    } catch (error) {
      console.error('Error fetching goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemIndex: number) => {
    if (!selectedGoals || !goalsData) return;
    
    const checkboxItems = goalsData.items.filter(item => !item.is_area_header);
    
    if (itemIndex >= checkboxItems.length) return;
    
    try {
      await fetch(`${API_URL}/goals/${selectedGoals}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_index: itemIndex })
      });
      
      await fetchGoalsData();
    } catch (error) {
      console.error('Error toggling goals item:', error);
    }
  };

  if (availableGoals.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#2d3748', 
        border: '1px solid #4a5568', 
        borderRadius: '8px', 
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <button
          onClick={toggleExpanded}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#1a202c',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>🎯 Goals</span>
          <span style={{ fontSize: '12px' }}>
            {isExpanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </button>
        
        {isExpanded && (
          <div style={{ padding: '16px' }}>
            <p style={{ color: '#a0aec0', margin: 0 }}>
              No goals files found. Create goals_5y.txt, goals_1y.txt, and goals_semester.txt in the goals/ directory.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#2d3748', 
      border: '1px solid #4a5568', 
      borderRadius: '8px', 
      marginBottom: '24px',
      overflow: 'hidden'
    }}>
      <button
        onClick={toggleExpanded}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#1a202c',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #4a5568' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>🎯 Goals</span>
        <span style={{ fontSize: '12px' }}>
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>
      
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select
                value={selectedGoals}
                onChange={(e) => {
                  const newGoals = e.target.value;
                  if (onSelectedGoalsChange) {
                    onSelectedGoalsChange(newGoals);
                  } else {
                    setInternalSelectedGoals(newGoals);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: '#f7fafc',
                  fontSize: '14px'
                }}
              >
                {availableGoals.map(goals => (
                  <option key={goals} value={goals}>
                    {goals.includes('5y') ? '5 Year' : 
                     goals.includes('1y') ? 'Annual' : 
                     goals.includes('semester') ? 'Semester' : goals}
                  </option>
                ))}
              </select>
              
              {/* View Filter */}
              <select
                value={showCompleted ? 'all' : 'incomplete'}
                onChange={(e) => setShowCompleted(e.target.value === 'all')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: '#f7fafc',
                  fontSize: '14px'
                }}
              >
                <option value="all">Show All Goals</option>
                <option value="incomplete">Show Incomplete Only</option>
              </select>
            </div>
          </div>

          {loading && (
            <div style={{ 
              color: '#a0aec0', 
              textAlign: 'center',
              padding: '20px'
            }}>
              Loading...
            </div>
          )}

          {goalsData && !loading && (
            <div>
              {/* Progress Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ color: '#a0aec0', fontSize: '14px' }}>
                    Progress
                  </span>
                  <span style={{ color: '#f7fafc', fontSize: '14px', fontWeight: 'bold' }}>
                    {goalsData.completed_items}/{goalsData.total_items} ({goalsData.completion_percentage}%)
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#1a202c',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${goalsData.completion_percentage}%`,
                    height: '100%',
                    backgroundColor: goalsData.completion_percentage === 100 ? '#38a169' : '#f59e0b',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Goals Items */}
              <div>
                {goalsData.items
                  .filter((item) => {
                    // Always show area headers
                    if (item.is_area_header) return true;
                    // Apply completion filter only to actual items
                    return showCompleted || !item.completed;
                  })
                  .map((item, index) => {
                  if (item.is_area_header) {
                    // Render area header
                    return (
                      <div
                        key={index}
                        style={{
                          color: '#f59e0b',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          margin: '16px 0 8px 0',
                          paddingBottom: '4px',
                          borderBottom: '2px solid #f59e0b'
                        }}
                      >
                        {item.text}
                      </div>
                    );
                  } else {
                    // Render checkbox item with proper indentation
                    const checkboxItems = goalsData.items.filter(i => !i.is_area_header);
                    const checkboxIndex = checkboxItems.findIndex(i => i.id === item.id);
                    const indentLevel = item.indent_level || 1;
                    const leftMargin = 16 + ((indentLevel - 1) * 24);
                    
                    return (
                      <div key={index}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            margin: `4px 0 4px ${leftMargin}px`,
                            backgroundColor: item.completed ? '#1a202c' : '#4a5568',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#f59e0b';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <div 
                            onClick={() => toggleItem(checkboxIndex)}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              border: '2px solid #f59e0b',
                              marginRight: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: item.completed ? '#f59e0b' : 'transparent',
                              flexShrink: 0
                            }}
                          >
                            {item.completed && (
                              <span style={{ 
                                color: 'white', 
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div>
                              <span style={{
                                color: item.completed ? '#a0aec0' : '#f7fafc',
                                textDecoration: item.completed ? 'line-through' : 'none',
                                fontSize: '14px',
                                lineHeight: '1.4'
                              }}>
                                {item.text}
                              </span>
                            </div>
                            {item.metadata?.notes && (
                              <div style={{
                                color: '#9ca3af',
                                fontSize: '12px',
                                marginTop: '4px',
                                fontStyle: 'italic',
                                lineHeight: '1.3'
                              }}>
                                📝 {item.metadata.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              {goalsData.items.length === 0 && (
                <div style={{ 
                  color: '#a0aec0', 
                  textAlign: 'center',
                  padding: '20px',
                  fontStyle: 'italic'
                }}>
                  This goals file is empty.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Goals;
