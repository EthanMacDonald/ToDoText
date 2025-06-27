# Lists Feature

The Lists feature provides a simple checklist interface for working through predefined lists like groceries, packing, or any other items you need to check off systematically.

## How It Works

### List Format
Lists use a simple text format with checkboxes:
```
[ ] Item description
[x] Completed item
[ ] Another item with optional metadata
```

### Supported Syntax
- `[ ]` - Unchecked item
- `[x]` - Checked/completed item  
- `#` - Comments (ignored)
- Empty lines are ignored

### Example Lists

#### Grocery List (`lists/grocery.txt`)
```
[ ] Milk (2%)
[ ] Bread (whole wheat)
[ ] Eggs (dozen)
[ ] Bananas
[ ] Chicken breast
[ ] Rice
[ ] Onions
[ ] Tomatoes
[ ] Cheese (cheddar)
[ ] Yogurt (Greek)
```

#### Packing List (`lists/packing.txt`)
```
[ ] Passport/ID
[ ] Phone charger
[ ] Clothes (3 days)
[ ] Toiletries
[ ] Medications
[ ] Laptop
[ ] Camera
[ ] Travel insurance docs
[ ] Cash/cards
[ ] Sunglasses
```

## Features

### Dashboard Integration
- **List Selector**: Choose from available lists in dropdown
- **Progress Tracking**: See completion percentage
- **Quick Actions**: Check/uncheck items with single click
- **Auto-save**: Changes are saved automatically
- **Reset Function**: Clear all checks to start over

### Creating New Lists
1. Create a new `.txt` file in the `lists/` directory
2. Follow the checkbox format: `[ ] Item name`
3. Restart the dashboard to see the new list

### List Management
- **Check Items**: Click checkbox to mark complete
- **Uncheck Items**: Click checked box to mark incomplete  
- **Progress Bar**: Visual indicator of completion status
- **Reset List**: Button to clear all checks and start over

## API Endpoints

- `GET /lists` - Get all available lists
- `GET /lists/{list_name}` - Get specific list with items
- `POST /lists/{list_name}/toggle` - Toggle item completion
- `POST /lists/{list_name}/reset` - Reset all items to unchecked

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
3. **Regular maintenance**: Update lists based on your changing needs
4. **Quick completion**: Use the dashboard for rapid checking during activities

The Lists feature is perfect for:
- 🛒 Grocery shopping
- 🧳 Travel packing  
- 📋 Project checklists
- 🏠 Household tasks
- 📚 Reading lists
- 🎯 Goal tracking

Simple, efficient, and integrated with your existing task management workflow!
