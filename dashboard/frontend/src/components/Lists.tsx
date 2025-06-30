import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

interface ListItem {
  id: number;
  text: string;
  completed: boolean;
  line_number: number;
  is_area_header?: boolean;
  area?: string;
  indent_level?: number;
}

interface ListData {
  name: string;
  title: string;
  items: ListItem[];
  total_items: number;
  completed_items: number;
  completion_percentage: number;
}

interface Props {
  isExpanded?: boolean; // Control expand/collapse state externally
  onToggleExpanded?: (expanded: boolean) => void; // Callback when expand state changes
  selectedList?: string; // Control selected list externally
  onSelectedListChange?: (listName: string) => void; // Callback when selected list changes
  isStateLoaded?: boolean; // Indicates if the dashboard state has been loaded
}

function Lists({ isExpanded: externalIsExpanded, onToggleExpanded, selectedList: externalSelectedList, onSelectedListChange, isStateLoaded }: Props) {
  const [availableLists, setAvailableLists] = useState<string[]>([]);
  const [internalSelectedList, setInternalSelectedList] = useState<string>('');
  const selectedList = externalSelectedList !== undefined ? externalSelectedList : internalSelectedList;
  const [listData, setListData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    if (onToggleExpanded) {
      onToggleExpanded(newExpanded);
    } else {
      setInternalIsExpanded(newExpanded);
    }
  };

  // Fetch available lists on component mount
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const response = await fetch(`${API_URL}/lists`);
        const lists = await response.json();
        const listNames = lists.map((list: any) => list.name);
        setAvailableLists(listNames);
        
        // Only set default if state is loaded and we need to set a default
        if (isStateLoaded && listNames.length > 0) {
          // If there's a saved selection and it exists in available lists, keep it
          if (selectedList && listNames.includes(selectedList)) {
            // Selection is valid, no need to change
            return;
          }
          
          // If no valid selection, set to first available list
          if (!selectedList || !listNames.includes(selectedList)) {
            const defaultList = listNames[0];
            if (onSelectedListChange) {
              onSelectedListChange(defaultList);
            } else {
              setInternalSelectedList(defaultList);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching lists:', error);
      }
    };
    
    fetchLists();
  }, [isStateLoaded, selectedList, onSelectedListChange]); // Include dependencies

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
    if (!selectedList || !listData) return;
    
    // Get only checkbox items (not area headers)
    const checkboxItems = listData.items.filter(item => !item.is_area_header);
    
    // Make sure we're clicking on a valid checkbox item
    if (itemIndex >= checkboxItems.length) return;
    
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
            <select
              value={selectedList}
              onChange={(e) => {
                const newList = e.target.value;
                if (onSelectedListChange) {
                  onSelectedListChange(newList);
                } else {
                  setInternalSelectedList(newList);
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
                {listData.items.map((item, index) => {
                  if (item.is_area_header) {
                    // Render area header
                    return (
                      <div
                        key={index}
                        style={{
                          color: '#4299e1',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          margin: '16px 0 8px 0',
                          paddingBottom: '4px',
                          borderBottom: '2px solid #4299e1'
                        }}
                      >
                        {item.text}
                      </div>
                    );
                  } else {
                    // Render checkbox item with proper indentation
                    const checkboxItems = listData.items.filter(i => !i.is_area_header);
                    const checkboxIndex = checkboxItems.findIndex(i => i.id === item.id);
                    const indentLevel = item.indent_level || 1;
                    const leftMargin = 16 + ((indentLevel - 1) * 24); // Base 16px + 24px per additional level
                    
                    return (
                      <div
                        key={index}
                        onClick={() => toggleItem(checkboxIndex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          margin: `4px 0 4px ${leftMargin}px`, // Dynamic left margin based on indent level
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
                    );
                  }
                })}
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
