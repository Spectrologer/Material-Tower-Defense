# CSS Architecture Guide

This document explains the CSS organization for the Iconic Defense project.

## File Structure

```
css/
├── utilities.css      # CSS custom properties, utility classes, animations
├── styles.css         # Main component styles and game-specific styling
└── responsive.css     # Media queries and responsive adjustments
```

## Loading Order

1. **utilities.css** - Loads first to define CSS custom properties
2. **styles.css** - Main styles that use the custom properties
3. **responsive.css** - Media queries that override base styles

## CSS Custom Properties (Variables)

All major design tokens are defined in `utilities.css`:

- `--primary-bg`: Main background gradient
- `--panel-bg`: UI panel background
- `--text-primary`: Primary text color
- `--button-bg`: Button background
- `--spacing-*`: Consistent spacing scale
- `--radius-*`: Border radius scale
- `--transition-*`: Animation durations
- `--z-*`: Z-index layers

## Utility Classes

Common patterns are available as utility classes:

- `.glass-effect`: Standard glassmorphism effect
- `.flex-center`: Center content with flexbox
- `.visually-hidden`: Screen reader only content
- `.loading`: Loading state styling
- `.animate-pulse`: Pulse animation

## Naming Conventions

- **Component styles**: Use descriptive class names (`.pixel-button`, `.game-ui-panel`)
- **State classes**: Use present tense (`.selected`, `.active`, `.hidden`)
- **Utility classes**: Use imperative mood (`.flex-center`, `.visually-hidden`)

## Responsive Design

Media queries are mobile-first and defined in `responsive.css`:

- Base styles work for mobile
- `@media (max-width: 640px)`: Small mobile adjustments
- `@media (max-width: 480px)`: Extra small mobile
- `@media (prefers-reduced-motion)`: Accessibility considerations

## Performance Considerations

- CSS custom properties reduce redundancy
- Animations use `transform` and `opacity` for better performance
- Complex gradients are cached in variables
- Unused styles have been removed

## Maintenance

When adding new styles:

1. Check if a utility class already exists
2. Use CSS custom properties for consistent values
3. Add responsive considerations to `responsive.css`
4. Document any new utility classes in this guide