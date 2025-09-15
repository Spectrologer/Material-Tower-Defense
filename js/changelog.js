export const changelog = [
    {
        version: '0.2.1',
        date: '2025-09-14',
        changes: [
            'Added a retractable bottom panel to provide more visibility of the game board.',
            'Added an "Upcoming Wave" preview that appears when the bottom panel is retracted.',
            'Fixed an issue where the "Upcoming Wave" preview would overlap with the tower selection panel.'
        ]
    },
    {
        version: '0.2.0',
        date: '2025-09-13',
        changes: [
            'Game music now automatically pauses when the app goes into the background on mobile.',
            'Added a service worker to enable offline play after the first visit.',
            'Fixed a bug where icons inside buttons could block click events.',
            'Ensured UI icons render with the correct font family.'
        ]
    },
    {
        version: '0.1.2',
        date: '2025-09-13',
        changes: [
            'Corrected an audio error in the enemy wiggle sound effect.',
            'Fixed a bug where the merge tooltip would get stuck on screen after a merge.',
            'Tower purchase buttons are now correctly deselected after a merge.',
            'Assigned unique IDs to enemies to prevent targeting issues.',
            'Stationary enemies (like Eggs) now correctly calculate path progress for targeting.',
            'Defeated Eggs now correctly unlock in the enemy library.'
        ]
    },
    {
        version: '0.1.1',
        date: '2025-09-13',
        changes: [
            'Refactored projectile rendering logic for improved clarity and extensibility.',
            'Resolved various bugs related to projectile property initialization.',
            'Cleaned up project structure by removing duplicated test files.'
        ]
    },
    {
        version: '0.1.0',
        date: '2025-09-13',
        changes: [
            'The Glass Update: Complete UI overhaul with a new style for all panels and buttons.',
            'Added a "Message Log" to review past in-game announcements.',
            'Introduced new enemy types: Healer, Flying, Stealth, Bitcoin, Summoner, Phantom, and Splitter.',
            'Rebalanced all waves from 1 to 25, introducing new enemy types and mechanics gradually.',
            'Added `endOfWaveAnnouncement` to provide players with hints about upcoming enemy types.',
            'Implemented a procedural wave generator for endless mode (waves 26+).',
            'Fixed an issue where the game would not properly reset after a "Game Over".'
        ]
    },
    // Add new changelog entries here, at the top of the array.
];
