import csv
import re
import argparse
from datetime import datetime
from collections import Counter, defaultdict

TASKS_FILE = 'tasks.txt'
CSV_FILE = 'task_statistics.csv'
DATE_FORMAT = '%Y-%m-%d'
TODAY = datetime.now().date()

# Regex patterns for metadata
done_pattern = re.compile(r'done:')
due_pattern = re.compile(r'due:(\d{4}-\d{2}-\d{2})')
priority_pattern = re.compile(r'\b([A-Z])\b')
project_pattern = re.compile(r'\+\w+')
context_pattern = re.compile(r'@\w+')


def parse_tasks(filename):
    tasks = []
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            task = {'raw': line}
            task['completed'] = bool(done_pattern.search(line))
            due_match = due_pattern.search(line)
            task['due'] = (
                datetime.strptime(due_match.group(1), DATE_FORMAT).date()
                if due_match else None
            )
            prio_match = priority_pattern.search(line)
            task['priority'] = prio_match.group(1) if prio_match else None
            task['projects'] = project_pattern.findall(line)
            task['contexts'] = context_pattern.findall(line)
            tasks.append(task)
    return tasks


def compute_statistics(tasks):
    stats = {}
    stats['total'] = len(tasks)
    stats['completed'] = sum(t['completed'] for t in tasks)
    stats['incomplete'] = stats['total'] - stats['completed']
    stats['completion_pct'] = (
        100 * stats['completed'] / stats['total'] if stats['total'] else 0
    )
    # By priority
    prio_counter = Counter(t['priority'] for t in tasks if t['priority'])
    for prio, count in prio_counter.items():
        stats[f'priority_{prio}'] = count
    # By project
    project_counter = Counter(p for t in tasks for p in t['projects'])
    for proj, count in project_counter.items():
        stats[f'project_{proj}'] = count
    # By context
    context_counter = Counter(c for t in tasks for c in t['contexts'])
    for ctx, count in context_counter.items():
        stats[f'context_{ctx}'] = count
    # Due dates
    stats['with_due_date'] = sum(1 for t in tasks if t['due'])
    stats['overdue'] = sum(1 for t in tasks if t['due'] and not t['completed'] and t['due'] < TODAY)
    stats['due_today'] = sum(1 for t in tasks if t['due'] == TODAY and not t['completed'])
    stats['due_this_week'] = sum(1 for t in tasks if t['due'] and not t['completed'] and 0 <= (t['due'] - TODAY).days < 7)
    return stats


def display_statistics(stats, use_table=False):
    if use_table:
        try:
            from tabulate import tabulate
            table = [[k, v] for k, v in stats.items()]
            print(tabulate(table, headers=["Statistic", "Value"], tablefmt="github"))
        except ImportError:
            print("Tabulate not installed. Falling back to CSV format.")
            use_table = False
    if not use_table:
        print("Statistic,Value")
        for k, v in stats.items():
            print(f"{k},{v}")


def save_statistics_csv(stats, filename):
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Statistic", "Value"])
        for k, v in stats.items():
            writer.writerow([k, v])


def main():
    parser = argparse.ArgumentParser(description="Display and save task statistics.")
    parser.add_argument('--table', action='store_true', help='Display statistics in a table format (requires tabulate)')
    args = parser.parse_args()

    tasks = parse_tasks(TASKS_FILE)
    stats = compute_statistics(tasks)
    display_statistics(stats, use_table=args.table)
    save_statistics_csv(stats, CSV_FILE)
    print(f"\nStatistics saved to {CSV_FILE}")


if __name__ == "__main__":
    main()
