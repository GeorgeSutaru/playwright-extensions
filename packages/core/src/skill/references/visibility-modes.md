# Visibility Modes

Control how race locator determines which element "wins" the race.

## Available Modes

### `default` (or `visible`)

Element must be visible and rendered. Equivalent to checking `locator.isVisible()`.

```typescript
const winner = await LocatorRace.race([
  page.locator('#hidden'),
  page.locator('#visible'),
], { visibilityMode: 'default' });

// #visible wins because #hidden has display:none
expect(await winner.textContent()).toBe('Visible');
```

**Use when:** You need to interact with the element (click, fill, etc.)

### `presence`

Element must exist in the DOM, regardless of visibility.

```typescript
const winner = await LocatorRace.race([
  page.locator('#hidden'),
  page.locator('#visible'),
], { visibilityMode: 'presence' });

// Both match - throws strict mode violation
```

**Use when:** You need to check if an element exists, or will interact with it later

## Mode Comparison

| Mode | `display:none` | Off-screen | In viewport | In DOM |
|------|---------------|------------|-------------|--------|
| `default` | No | No | No | Yes |
| `visible` | No | Yes | Yes | Yes |
| `presence` | Yes | Yes | Yes | Yes |

## Examples

### Checking for hidden elements

```typescript
const winner = await LocatorRace.race([
  page.locator('[data-analytics]'),
], { visibilityMode: 'presence' });

expect(await winner.count()).toBeGreaterThan(0);
```

### Off-screen content

```typescript
const winner = await LocatorRace.race([
  page.locator('#footer-cta'),
], { visibilityMode: 'visible' });

expect(await winner.textContent()).toBe('Learn More');
```

### Conditional visibility

```typescript
const winner = await LocatorRace.race([
  page.locator('#premium-feature'),
  page.locator('#free-feature'),
], { visibilityMode: 'presence' });

const isPremium = await winner.locator('#premium-feature').isVisible().catch(() => false);
```

### Mixed visibility scenarios

```typescript
const winner = await LocatorRace.race([
  page.locator('#variant-a'),  // display:none
  page.locator('#variant-b'),  // visible
], { visibilityMode: 'default' });

expect(await winner.id()).toBe('variant-b');

await expect(
  LocatorRace.race([
    page.locator('#variant-a'),
    page.locator('#variant-b'),
  ], { visibilityMode: 'presence' }),
).rejects.toThrow('Strict mode violation');
```

## Best Practices

1. **Use `default` for interactions** - When clicking/filling, element must be visible
2. **Use `presence` for existence checks** - When verifying an element is in the DOM
3. **Use `visible` for off-screen content** - When element is rendered but not in viewport
4. **Consider strict violations** - With `presence` mode, hidden elements still count
5. **Match mode to intent** - Choose the mode that reflects what "winning" means for your test
