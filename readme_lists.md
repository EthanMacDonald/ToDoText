# Lists Feature

The Lists feature provides a simple checklist interface for working through predefined lists like groceries, packing, or any other items you need to check off systematically.

## How It Works

### List Format
Lists use a hierarchical format with area headers and indented checkbox items, similar to the main tasks.txt format:

```
Area Header:
    - [ ] Item description
    - [x] Completed item
    - [ ] Another item with optional metadata

Another Area:
    - [ ] More items
    - [ ] Under this area
```

### Supported Syntax
- Area headers: Lines ending with `:` (not indented)
- `- [ ]` - Unchecked item (must be indented with 4 spaces or tab)
- `- [x]` - Checked/completed item (must be indented)
- `#` - Comments (ignored)
- Empty lines are ignored
- **Metadata**: Items can include metadata in parentheses (e.g., `(quantity:2)`)

### Metadata Support
List items support metadata similar to regular tasks, using the same parentheses format:

**Quantity Field**:
- Add quantity information to specify amounts, counts, or measurements
- Format: `(quantity:value)`
- Examples:
  - `(quantity:2)` - Simple count
  - `(quantity:1 lb)` - Weight measurement  
  - `(quantity:3 boxes)` - Count with units
  - `(quantity:500ml)` - Volume measurement

**Multiple Metadata**:
- Can include multiple metadata fields in the same parentheses
- Separate with spaces: `(quantity:2 priority:high)`

### Example Lists

#### Grocery List (`lists/grocery.txt`)
```
# Grocery Shopping List
# Updated: 2025-06-27

Dairy & Eggs:
    - [ ] Milk (2% or whole) (quantity:2)
    - [ ] Eggs (dozen, free range)
    - [ ] Cheese (sharp cheddar block) (quantity:1 lb)
    - [ ] Greek yogurt (plain, large container)

Produce:
    - [ ] Bananas (ripe)
    - [ ] Onions (yellow, 2-3 medium)
    - [ ] Tomatoes (Roma, 4-5)
    - [ ] Spinach (fresh bag)
    - [ ] Bell peppers (red/yellow)
    - [ ] Garlic (1 bulb)
    - [ ] Avocados (2-3, firm)

Meat & Protein:
    - [ ] Chicken breast (quantity:2 lbs)
    - [ ] Ground turkey (quantity:1 lb)
```

#### Packing List (`lists/packing.txt`)
```
# Travel Packing Checklist
# For 3-5 day trips

Documents & Money:
    - [ ] Passport/Driver's License
    - [ ] Travel insurance documents
    - [ ] Flight/hotel confirmations
    - [ ] Cash (local currency)
    - [ ] Credit/debit cards

Electronics:
    - [ ] Phone + charger
    - [ ] Laptop + charger
    - [ ] Camera + memory cards
    - [ ] Portable battery pack
    - [ ] Universal adapter (international)

Clothing:
    - [ ] Underwear (quantity:5)
    - [ ] Socks (quantity:5)
    - [ ] Shirts/tops (quantity:4)
    - [ ] Pants/bottoms (quantity:3)
    - [ ] Comfortable walking shoes
```

## Features

### Dashboard Integration
- **Collapsible Panel**: Lists panel can be expanded/collapsed like other dashboard sections
- **List Selector**: Choose from available lists in dropdown
- **Area Headers**: Visual organization with colored area section headers
- **Progress Tracking**: See completion percentage (counts only checkbox items)
- **Quick Actions**: Check/uncheck items with single click
- **Auto-save**: Changes are saved automatically
- **Reset Function**: Clear all checks to start over
- **Inline Editing**: Edit item text and quantity metadata directly in the dashboard
- **Quantity Display**: Quantities appear as italic text next to item names

### Visual Organization
- **Area Headers**: Bold, colored section headers for organizing items
- **Indented Items**: Checkbox items are visually indented under their areas
- **Progress Calculation**: Only checkbox items count toward completion percentage
- **Hover Effects**: Visual feedback when hovering over clickable items
- **Quantity Indicators**: Subtle display of quantity information when present
- **Edit Controls**: Click the edit button (✏️) to modify items

### Creating New Lists
1. Create a new `.txt` file in the `lists/` directory
2. Follow the hierarchical format:
   ```
   Area Name:
       - [ ] Item name
       - [ ] Another item (quantity:2)
       - [ ] Item with measurement (quantity:1 lb)
   
   Another Area:
       - [ ] More items
   ```
3. Restart the dashboard to see the new list

### List Management
- **Check Items**: Click checkbox items to mark complete (area headers are not clickable)
- **Uncheck Items**: Click checked items to mark incomplete  
- **Edit Items**: Click the edit button (✏️) to modify item text and quantity
- **Quantity Fields**: Add or modify quantity information for precise tracking
- **Progress Bar**: Visual indicator of completion status for checkbox items only
- **Reset List**: Button to clear all checkbox items and start over (preserves metadata)
- **Area Organization**: Items are visually grouped under their area headers
- **Metadata Preservation**: Quantity and other metadata are preserved when toggling completion

## API Endpoints

### GET /lists
Returns array of available lists with metadata:
```json
[
  {
    "name": "grocery",
    "title": "Grocery Shopping List", 
    "filename": "grocery.txt",
    "total_items": 15,
    "completed_items": 3,
    "completion_percentage": 20.0
  }
]
```

### GET /lists/{list_name}
Returns detailed list with items and area headers:
```json
{
  "name": "grocery",
  "title": "Grocery Shopping List",
  "items": [
    {
      "id": 3,
      "text": "Dairy & Eggs",
      "completed": false,
      "line_number": 3,
      "is_area_header": true,
      "area": "Dairy & Eggs"
    },
    {
      "id": 4,
      "text": "Milk",
      "completed": false,
      "line_number": 4,
      "is_area_header": false,
      "area": "Dairy & Eggs",
      "quantity": "2",
      "metadata": {
        "quantity": "2"
      }
    }
  ],
  "total_items": 15,
  "completed_items": 3,
  "completion_percentage": 20.0
}
```

### POST /lists/{list_name}/toggle
Toggle completion status of a checkbox item (area headers cannot be toggled, metadata preserved):
```json
{
  "item_index": 0
}
```

### POST /lists/{list_name}/update
Update an item's text and metadata:
```json
{
  "item_index": 0,
  "text": "Milk (2% or whole)",
  "quantity": "2 gallons"
}
```

### POST /lists/{list_name}/reset
Reset all checkbox items to unchecked (preserves area headers and metadata):
```json
{
  "success": true,
  "message": "List reset successfully"
}
```

## File Structure
```
lists/
├── grocery.txt        # Grocery shopping list
├── packing.txt        # Travel packing list
└── custom_list.txt    # Your custom lists
```

## Usage Tips

1. **Create thematic lists**: Separate lists for different purposes (travel, shopping, projects)
2. **Use descriptive names**: Include details in parentheses for clarity
3. **Add quantity metadata**: Use `(quantity:value)` to specify amounts, weights, or counts
4. **Regular maintenance**: Update lists based on your changing needs
5. **Quick completion**: Use the dashboard for rapid checking during activities
6. **Edit inline**: Use the edit button to modify quantities or descriptions as needed
7. **Metadata persistence**: Quantities are preserved when checking/unchecking items

**Quantity Examples:**
- `- [ ] Eggs (quantity:12)` - Count-based
- `- [ ] Ground beef (quantity:2 lbs)` - Weight-based  
- `- [ ] Milk (quantity:1 gallon)` - Volume-based
- `- [ ] Socks (quantity:5 pairs)` - Set-based
- `- [ ] Batteries (quantity:4 AA)` - Type and count

The Lists feature is perfect for:
- 🛒 Grocery shopping
- 🧳 Travel packing  
- 📋 Project checklists
- 🏠 Household tasks
- 📚 Reading lists
- 🎯 Goal tracking

Simple, efficient, and integrated with your existing task management workflow!
