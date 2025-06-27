import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

interface ListItem {
  id: number;
  text: string;
  completed: boolean;
  line_number: number;
}

interface ListData {
  name: string;
  title: string;
  items: ListItem[];
  total_items: number;
  completed_items: number;
  completion_percentage: number;
}

function Lists() {
  const [availableLists, setAvailableLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [listData, setListData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch available lists on component mount
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const response = await fetch(`${API_URL}/lists`);
        const lists = await response.json();
        const listNames = lists.map((list: any) => list.name);
        setAvailableLists(listNames);
        if (listNames.length > 0 && !selectedList) {
          setSelectedList(listNames[0]);
        }
      } catch (error) {
        console.error('Error fetching lists:', error);
      }
    };
    
    fetchLists();
  }, []);

  // Fetch list data when selected list changes
  useEffect(() => {
    if (selectedList) {
      fetchListData();
    }
  }, [selectedList]);

  const fetchListData = async () => {
    if (!selectedList) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lists/${selectedList}`);
      const data = await response.json();
      setListData(data);
    } catch (error) {
      console.error('Error fetching list data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemIndex: number) => {
    if (!selectedList) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_index: itemIndex })
      });
      
      // Refresh list data
      await fetchListData();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const resetList = async () => {
    if (!selectedList) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/reset`, {
        method: 'POST'
      });
      
      // Refresh list data
      await fetchListData();
    } catch (error) {
      console.error('Error resetting list:', error);
    }
  };

  if (availableLists.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#2d3748', 
        border: '1px solid #4a5568', 
        borderRadius: '8px', 
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
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
          <span>📋 Lists</span>
          <span style={{ fontSize: '12px' }}>
            {isExpanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </button>
        
        {isExpanded && (
          <div style={{ padding: '16px' }}>
            <p style={{ color: '#a0aec0', margin: 0 }}>
              No lists available. Create some .txt files in the lists/ directory to get started.
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
        onClick={() => setIsExpanded(!isExpanded)}
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
        <span>📋 Lists</span>
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
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: '#f7fafc',
                  fontSize: '14px'
                }}
              >
                {availableLists.map(list => (
                  <option key={list} value={list}>
                    {list.replace('.txt', '')}
                  </option>
                ))}
              </select>
              
              {listData && (
                <button
                  onClick={resetList}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Reset
                </button>
              )}
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

          {listData && !loading && (
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
                    {listData.completed_items}/{listData.total_items} ({listData.completion_percentage}%)
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
                    width: `${listData.completion_percentage}%`,
                    height: '100%',
                    backgroundColor: listData.completion_percentage === 100 ? '#38a169' : '#3182ce',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* List Items */}
              <div>
                {listData.items.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => toggleItem(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      margin: '4px 0',
                      backgroundColor: item.completed ? '#1a202c' : '#4a5568',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#63b3ed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: '2px solid #63b3ed',
                      marginRight: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: item.completed ? '#3182ce' : 'transparent',
                      flexShrink: 0
                    }}>
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
                    <span style={{
                      color: item.completed ? '#a0aec0' : '#f7fafc',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {listData.items.length === 0 && (
                <div style={{ 
                  color: '#a0aec0', 
                  textAlign: 'center',
                  padding: '20px',
                  fontStyle: 'italic'
                }}>
                  This list is empty.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Lists;
