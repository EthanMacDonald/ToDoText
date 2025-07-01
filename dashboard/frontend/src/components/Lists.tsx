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
  quantity?: string;
  metadata?: Record<string, string>;
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
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemArea, setNewItemArea] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isAddFormExpanded, setIsAddFormExpanded] = useState(false);
  const [addingSubItemTo, setAddingSubItemTo] = useState<number | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');
  const [newSubItemQuantity, setNewSubItemQuantity] = useState('');
  const [newSubItemNotes, setNewSubItemNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showCompleted, setShowCompleted] = useState(true); // Filter state for showing completed items

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

  const updateItem = async (itemIndex: number, text: string, quantity: string) => {
    if (!selectedList || !listData) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          item_index: itemIndex, 
          text: text,
          quantity: quantity,
          notes: editNotes.trim() || undefined
        })
      });
      
      // Refresh list data
      await fetchListData();
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const startEditing = (itemIndex: number, item: ListItem) => {
    setEditingItem(itemIndex);
    setEditText(item.text);
    setEditQuantity(item.quantity || '');
    // Extract notes from item metadata
    setEditNotes(item.metadata?.notes || '');
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

  const addItem = async () => {
    if (!selectedList || !newItemText.trim()) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: newItemText.trim(),
          quantity: newItemQuantity.trim() || undefined,
          area: newItemArea.trim() || undefined,
          notes: newItemNotes.trim() || undefined
        })
      });
      
      // Refresh list data and clear form
      await fetchListData();
      setNewItemText('');
      setNewItemQuantity('');
      setNewItemArea('');
      setNewItemNotes('');
      setIsAddFormExpanded(false); // Auto-collapse form after adding
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const deleteItem = async (itemIndex: number) => {
    if (!selectedList || !listData) return;
    
    const item = listData.items.filter(item => !item.is_area_header)[itemIndex];
    if (!item) return;
    
    if (!window.confirm(`Are you sure you want to delete "${item.text}"?`)) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_index: itemIndex })
      });
      
      // Refresh list data
      await fetchListData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const addSubItem = async (parentIndex: number) => {
    if (!selectedList || !newSubItemText.trim()) return;
    
    try {
      await fetch(`${API_URL}/lists/${selectedList}/add-subitem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parent_index: parentIndex,
          text: newSubItemText.trim(),
          quantity: newSubItemQuantity.trim() || undefined,
          notes: newSubItemNotes.trim() || undefined
        })
      });
      
      // Refresh list data and clear form
      await fetchListData();
      setNewSubItemText('');
      setNewSubItemQuantity('');
      setNewSubItemNotes('');
      setAddingSubItemTo(null);
    } catch (error) {
      console.error('Error adding sub-item:', error);
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
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <option value="all">Show All Items</option>
                <option value="incomplete">Show Incomplete Only</option>
              </select>
            </div>
            
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

          {/* Add New Item Form */}
          {listData && !loading && (
            <div style={{ 
              marginTop: '16px', 
              marginBottom: '16px',
              backgroundColor: '#374151',
              borderRadius: '6px',
              border: '1px solid #4a5568',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setIsAddFormExpanded(!isAddFormExpanded)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4b5563',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#f7fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: isAddFormExpanded ? '1px solid #4a5568' : 'none'
                }}
              >
                <span>➕ Add New Item</span>
                <span style={{ fontSize: '12px' }}>
                  {isAddFormExpanded ? '▲' : '▼'}
                </span>
              </button>
              
              {isAddFormExpanded && (
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Item description..."
                      style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #4a5568',
                        backgroundColor: '#1a202c',
                        color: '#f7fafc'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newItemText.trim()) {
                          addItem();
                        }
                      }}
                    />
                    <input
                      type="text"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="Quantity (optional)"
                      style={{
                        width: '140px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #4a5568',
                        backgroundColor: '#1a202c',
                        color: '#f7fafc'
                      }}
                    />
                    <input
                      type="text"
                      value={newItemArea}
                      onChange={(e) => setNewItemArea(e.target.value)}
                      placeholder="Area (optional)"
                      style={{
                        width: '140px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #4a5568',
                        backgroundColor: '#1a202c',
                        color: '#f7fafc'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <textarea
                      value={newItemNotes}
                      onChange={(e) => setNewItemNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #4a5568',
                        backgroundColor: '#1a202c',
                        color: '#f7fafc',
                        resize: 'vertical',
                        minHeight: '60px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={addItem}
                      disabled={!newItemText.trim()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: newItemText.trim() ? '#059669' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: newItemText.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {listData.items
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
                    
                    // Check if this item is being edited
                    if (editingItem === checkboxIndex) {
                      return (
                        <div key={index}>
                          <div
                            style={{
                              margin: `4px 0 4px ${leftMargin}px`,
                              backgroundColor: '#2d3748',
                              borderRadius: '4px',
                              padding: '12px',
                              border: '2px solid #63b3ed'
                            }}
                          >
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#a0aec0' }}>
                                Item Text
                              </label>
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc'
                                }}
                                autoFocus
                              />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#a0aec0' }}>
                                Quantity (optional)
                              </label>
                              <input
                                type="text"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                placeholder="e.g., 2, 1 lb, 3 boxes"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc'
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#a0aec0' }}>
                                Notes (optional)
                              </label>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc',
                                  resize: 'vertical',
                                  minHeight: '60px',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => {
                                    setEditingItem(null); // Close edit panel first
                                    setAddingSubItemTo(addingSubItemTo === checkboxIndex ? null : checkboxIndex);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                  title="Add sub-item"
                                >
                                  ➕ Add Sub-Item
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete "${item.text}"?`)) {
                                      deleteItem(checkboxIndex);
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                  title="Delete item"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setEditingItem(null)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: '1px solid #4a5568',
                                    backgroundColor: '#2d3748',
                                    color: '#a0aec0',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => updateItem(checkboxIndex, editText, editQuantity)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#3182ce',
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index}>
                        <div
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
                          <div 
                            onClick={() => toggleItem(checkboxIndex)}
                            style={{
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
                              {item.quantity && (
                                <span style={{
                                  color: '#9ca3af',
                                  fontSize: '12px',
                                  marginLeft: '8px',
                                  fontStyle: 'italic'
                                }}>
                                  (quantity: {item.quantity})
                                </span>
                              )}
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
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(checkboxIndex, item);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#63b3ed',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '4px'
                              }}
                              title="Edit item"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                        
                        {/* Add Sub-Item Form - positioned directly under this item */}
                        {addingSubItemTo === checkboxIndex && (
                          <div style={{ 
                            margin: `8px 0 8px ${leftMargin + 24}px`, // Indent more than parent
                            padding: '12px',
                            backgroundColor: '#374151',
                            borderRadius: '6px',
                            border: '1px solid #4a5568'
                          }}>
                            <h4 style={{ 
                              color: '#f7fafc', 
                              margin: '0 0 8px 0', 
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              Add Sub-Item to: {item.text}
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                value={newSubItemText}
                                onChange={(e) => setNewSubItemText(e.target.value)}
                                placeholder="Sub-item description..."
                                style={{
                                  flex: '1',
                                  minWidth: '200px',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc'
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newSubItemText.trim()) {
                                    addSubItem(addingSubItemTo);
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                value={newSubItemQuantity}
                                onChange={(e) => setNewSubItemQuantity(e.target.value)}
                                placeholder="Quantity (optional)"
                                style={{
                                  width: '140px',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc'
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <textarea
                                value={newSubItemNotes}
                                onChange={(e) => setNewSubItemNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '4px',
                                  border: '1px solid #4a5568',
                                  backgroundColor: '#1a202c',
                                  color: '#f7fafc',
                                  resize: 'vertical',
                                  minHeight: '60px',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setAddingSubItemTo(null)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => addSubItem(addingSubItemTo)}
                                disabled={!newSubItemText.trim()}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: newSubItemText.trim() ? '#059669' : '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: newSubItemText.trim() ? 'pointer' : 'not-allowed',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}
                              >
                                Add Sub-Item
                              </button>
                            </div>
                          </div>
                        )}
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
