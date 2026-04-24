# Error Handling with Race Locator

Race locator provides structured error handling for ambiguous UI scenarios.

## Error Types

### Strict Mode Violation

Thrown when multiple locators satisfy the condition simultaneously:

```typescript
try {
  await LocatorRace.race([
    page.locator('#first'),
    page.locator('#second'),
  ]);
} catch (err) {
  if (err.message.includes('Strict mode violation')) {
    // Multiple elements matched - handle the ambiguity
    console.log('Multiple elements found:', err.message);
  }
}
```

### Timeout

Thrown when no locator satisfies the condition within the timeout:

```typescript
try {
  await LocatorRace.race([
    page.locator('#maybe-shown'),
    page.locator('#maybe-hidden'),
  ], { timeout: 3000 });
} catch (err) {
  if (err.message.includes('Timeout')) {
    // Neither element appeared - handle gracefully
    console.log('Expected elements not found');
  }
}
```

### No Locator Satisfied

Thrown when compound locator resolves but none of the individual locators satisfy the condition:

```typescript
try {
  await LocatorRace.race([
    page.locator('#hidden-a'),
    page.locator('#hidden-b'),
  ]);
} catch (err) {
  if (err.message.includes('No locator satisfied')) {
    console.log('No element met the visibility condition');
  }
}
```

## Patterns

### Graceful Degradation

```typescript
async function submitForm(page: Page): Promise<'success' | 'error'> {
  try {
    const winner = await LocatorRace.race([
      page.getByText('Success'),
      page.getByText('Error'),
    ], { timeout: 5000 });

    const text = await winner.textContent();
    return text.includes('Success') ? 'success' : 'error';
  } catch {
    return 'error';
  }
}
```

### Retry with Fallback

```typescript
async function clickWithFallback(page: Page): Promise<void> {
  const strategies = [
    () => LocatorRace.race([
      page.getByRole('button', { name: 'Submit' }),
      page.getByRole('button', { name: 'Continue' }),
    ]),
    () => page.getByRole('button', { name: /submit|continue/i }).first(),
  ];

  let lastError: Error | null = null;
  for (const strategy of strategies) {
    try {
      const winner = await strategy();
      await winner.click();
      return;
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError;
}
```

### Optional Element Handling

```typescript
async function handleOptionalDialog(page: Page): Promise<boolean> {
  try {
    // Race between dialog appearing and timeout
    const winner = await LocatorRace.race([
      page.locator('.dialog--confirm'),
      page.locator('.dialog--dismiss'),
    ], { timeout: 2000 });

    // Dialog appeared - dismiss it
    const dismissBtn = winner.locator('button:has-text("Dismiss")');
    await dismissBtn.click({ timeout: 1000 }).catch(() => {});
    return true;
  } catch {
    // No dialog appeared - continue
    return false;
  }
}
```

### Distinguishing Error Types

```typescript
async function handleRaceResult(page: Page): Promise<string> {
  try {
    const winner = await LocatorRace.race([
      page.getByRole('heading', { name: 'Welcome' }),
      page.getByRole('heading', { name: 'Sign In' }),
    ], { timeout: 5000 });

    return await winner.textContent();
  } catch (err: any) {
    if (err.message.includes('Strict mode violation')) {
      // Multiple elements visible - unexpected state
      throw new Error('Unexpected UI state: multiple elements visible');
    }
    if (err.message.includes('No locator satisfied')) {
      // Neither element appeared - timeout or hidden
      return 'neither-shown';
    }
    throw err;
  }
}
```

## CLI Examples with pw-ext

```bash
# pw-ext exits with code 1 on failure - check exit code in scripts
pw-ext race-locator "#maybe-shown" "#maybe-hidden" --timeout 3000
if [ $? -ne 0 ]; then
  echo "Expected elements not found"
fi

# Use presence mode for elements that may be hidden
pw-ext race-locator "#hidden-a" "#hidden-b" --visibility presence
```

## Best Practices

1. **Always wrap in try-catch** - Race operations can fail in multiple ways
2. **Check error messages** - Different errors require different handling
3. **Use timeouts** - Prevent infinite waiting
4. **Provide fallback strategies** - Have alternative locators ready
5. **Log race results** - Useful for debugging flaky tests