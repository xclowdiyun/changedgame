import json
import argparse
from pathlib import Path


def load_endings(path: Path):
    data = json.loads(path.read_text(encoding='utf-8'))
    return data.get('_meta', {})


def check_requirements(req: dict, stats: dict, flags: dict) -> bool:
    # req may contain 'min' and 'flags'
    mins = req.get('min', {})
    maxs = req.get('max', {})
    req_flags = req.get('flags', {})

    for k, v in mins.items():
        if stats.get(k, 0) < v:
            return False

    for k, v in maxs.items():
        if stats.get(k, 0) > v:
            return False

    for fk, fv in req_flags.items():
        # requirement flags expected boolean (default False if missing)
        if flags.get(fk, False) != fv:
            return False

    return True


def evaluate(endings_meta: dict, stats: dict, flags: dict):
    satisfied = []
    for eid, meta in endings_meta.items():
        if check_requirements(meta.get('requirements', {}), stats, flags):
            satisfied.append(eid)
    return satisfied


def choose_highest_priority(endings_meta: dict, satisfied: list, order: list | None = None):
    if not satisfied:
        return None

    def score(eid: str):
        meta = endings_meta.get(eid, {})
        p = meta.get('priority', 0)
        tie = 0
        if order and eid in order:
            # smaller index in order => higher priority, so invert for tie-breaking
            tie = -order.index(eid)
        return (p, tie)

    return max(satisfied, key=score)


EXAMPLE_STATS = {
    'powder': 10,
    'jealousy': 0,
    'hatred': 0,
    'love': 0,
    'patience': 0,
    'depression': 0,
}


def parse_kv(pair: str):
    if '=' not in pair:
        raise ValueError('Expected key=value')
    k, v = pair.split('=', 1)
    try:
        iv = int(v)
        return k, iv
    except ValueError:
        if v.lower() in ('true', 'false'):
            return k, v.lower() == 'true'
        return k, v


def main():
    parser = argparse.ArgumentParser(description='Check which of endings 6-10 are satisfied for given stats/flags')
    parser.add_argument('--endings', type=str, default='endings_6to10.json')
    parser.add_argument('--stat', action='append', help='stat assignment, e.g. --stat hatred=60', default=[])
    parser.add_argument('--flag', action='append', help='flag to set true, e.g. --flag whipPetInstalled', default=[])
    parser.add_argument('--show-meta', action='store_true', help='Show loaded endings metadata')

    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    meta_path = root / args.endings
    if not meta_path.exists():
        print('Could not find', meta_path)
        return

    endings_meta = load_endings(meta_path)

    stats = EXAMPLE_STATS.copy()
    flags = {}

    for f in args.flag:
        flags[f] = True

    for pair in args.stat:
        k, v = parse_kv(pair)
        stats[k] = v

    if args.show_meta:
        print(json.dumps(endings_meta, indent=2, ensure_ascii=False))

    satisfied = evaluate(endings_meta, stats, flags)

    print('Current stats:', stats)
    print('Flags:', flags)

    # default ending order from game.js for tie-breaking
    ending_order = ['ending01_newcomer','ending02_angel','ending03_trust','ending04_absurd','ending05_symbiosis','ending6','ending7','ending8','ending9','ending10']

    best = choose_highest_priority(endings_meta, satisfied, ending_order)
    if best:
        print('Chosen ending (highest priority):', best)
    else:
        print('No endings satisfied.')


if __name__ == '__main__':
    main()
