# Multi-Validator Email Test Example

## Test Template: Email with Multiple Validators

```xml
<div class="p-6 max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow">
  <h2 class="text-2xl font-bold mb-6">Email Validation Test</h2>

  <!-- Email Variable -->
  <Var name="email" type="string" initial="" />

  <!-- Email Input with Multiple Validators -->
  <div class="mb-4">
    <label class="block text-sm font-medium mb-2">Email Address</label>
    <TInput var="email" type="email" placeholder="you@example.com" class="w-full px-3 py-2 border rounded">
      <Validate required="true" message="Email is required" />
      <Validate pattern="email" message="Invalid email format" />
      <Validate pattern="@gmail\.com$|@yahoo\.com$|@hotmail\.com$" message="Must be Gmail, Yahoo, or Hotmail" />
    </TInput>

    <!-- Show all errors (Pattern 2) -->
    <Show data="email_valid" not>
      <div class="mt-2 space-y-1">
        <ForEach var="email_errors" item="err">
          <div class="text-red-600 text-sm">
            ✗ <ShowVar name="err" />
          </div>
        </ForEach>
      </div>
    </Show>

    <!-- Show success message when valid -->
    <Show data="email_valid">
      <div class="mt-2 text-green-600 text-sm">
        ✓ Email is valid!
      </div>
    </Show>
  </div>

  <!-- Debug Info -->
  <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
    <p class="font-semibold mb-2">Debug Info:</p>
    <p>email_valid: <ShowVar name="email_valid" /></p>
    <p>email_error: <ShowVar name="email_error" /></p>
    <p>email_errors count: <ShowVar name="email_errors" format="length" /></p>
  </div>
</div>
```

## Test Cases and Expected Behavior

### Test Case 1: Empty Email
**Input:** `""` (empty)
**Expected Result:**
- `email_valid` = `false`
- `email_errors` = `["Email is required"]`
- **Shows:** ✗ Email is required

### Test Case 2: Invalid Format (No @)
**Input:** `"chimptyogmail.com"`
**Expected Result:**
- `email_valid` = `false`
- `email_errors` = `["Invalid email format", "Must be Gmail, Yahoo, or Hotmail"]`
- **Shows:**
  - ✗ Invalid email format
  - ✗ Must be Gmail, Yahoo, or Hotmail

### Test Case 3: Valid Format but Wrong Domain
**Input:** `"test@example.com"`
**Expected Result:**
- `email_valid` = `false`
- `email_errors` = `["Must be Gmail, Yahoo, or Hotmail"]`
- **Shows:** ✗ Must be Gmail, Yahoo, or Hotmail

### Test Case 4: Valid Gmail
**Input:** `"annabellechimpton@gmail.com"`
**Expected Result:**
- `email_valid` = `true`
- `email_errors` = `[]`
- **Shows:** ✓ Email is valid!

### Test Case 5: Valid Yahoo
**Input:** `"user@yahoo.com"`
**Expected Result:**
- `email_valid` = `true`
- `email_errors` = `[]`
- **Shows:** ✓ Email is valid!

### Test Case 6: Valid Hotmail
**Input:** `"someone@hotmail.com"`
**Expected Result:**
- `email_valid` = `true`
- `email_errors` = `[]`
- **Shows:** ✓ Email is valid!

## Simpler Example: Just Pattern + Required

```xml
<div class="mb-4">
  <Var name="email" type="string" initial="" />
  <label class="block text-sm font-medium mb-2">Email Address</label>

  <TInput var="email" type="email" placeholder="you@example.com" class="w-full">
    <Validate pattern="email" message="Invalid email format" />
    <Validate required="true" message="Email is required" />
  </TInput>

  <!-- Show first error only (Pattern 1) -->
  <Show data="email_valid" not>
    <div class="mt-1 text-red-600 text-sm">
      <ShowVar name="email_error" />
    </div>
  </Show>
</div>
```

### Expected Behavior (Simple Version):

| Input | email_valid | email_error | Display |
|-------|-------------|-------------|---------|
| `""` (empty) | `false` | `"Email is required"` | Email is required |
| `"chimptyogmail.com"` | `false` | `"Invalid email format"` | Invalid email format |
| `"test@example.com"` | `true` | `""` | (no error) |
| `"annabellechimpton@gmail.com"` | `true` | `""` | (no error) |

## How It Works

1. **Each validator runs independently** and reports its result with a unique ID
2. **Internal tracking** stores all validator results in `_email_validations` object
3. **Aggregation logic** combines results:
   - `email_valid` = ALL validators must pass (AND logic)
   - `email_error` = First error message (backward compatible)
   - `email_errors` = Array of ALL error messages (new)
4. **Reactive updates** - All derivative variables update when input changes

## Key Benefits

✅ **Real-time feedback** - Users see errors as they type
✅ **Clear requirements** - Show all validation rules at once
✅ **Flexible display** - Choose between first error or all errors
✅ **Type safe** - All variables properly typed and reactive
