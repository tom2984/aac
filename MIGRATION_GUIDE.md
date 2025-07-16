# Supabase API Proxy Migration Guide

## Problem Summary
- ✅ **Server-side**: Supabase works perfectly (66ms response time)
- ❌ **Client-side**: Direct Supabase calls timeout (5+ seconds)
- 🔧 **Solution**: Use API proxy pattern (client → API routes → Supabase)

## Migration Steps

### 1. Replace Direct Supabase Imports

**Before:**
```typescript
import { supabase } from '@/lib/supabase'
```

**After:**
```typescript
import { supabaseAPI } from '@/lib/supabase-api'
```

### 2. Update Authentication Calls

**Before:**
```typescript
// Get current user
const { data: { user }, error } = await supabase.auth.getUser()

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

**After:**
```typescript
// Get current user
const { user } = await supabaseAPI.getUser()

// Sign in
const { user, session } = await supabaseAPI.signInWithEmail(email, password)
```

### 3. Update Database Queries

**Before:**
```typescript
// Get all profiles
const { data, error } = await supabase
  .from('profiles')
  .select('*')

// Get specific profile
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// Insert new profile
const { data, error } = await supabase
  .from('profiles')
  .insert({ name, email })
```

**After:**
```typescript
// Get all profiles
const { data } = await supabaseAPI.getProfiles()

// Get specific profile
const { data } = await supabaseAPI.from('profiles')
  .select('*')
  .eq('id', userId)

// Insert new profile
const { data } = await supabaseAPI.from('profiles')
  .insert({ name, email })
  .execute()
```

### 4. Update Forms and Responses

**Before:**
```typescript
// Get forms
const { data, error } = await supabase
  .from('forms')
  .select('*')

// Get form responses
const { data, error } = await supabase
  .from('form_responses')
  .select('*')
  .eq('form_id', formId)
```

**After:**
```typescript
// Get forms
const { data } = await supabaseAPI.getForms()

// Get form responses
const { data } = await supabaseAPI.getFormResponses(formId)
```

### 5. Update React Components

**Before:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
    
    if (error) {
      console.error('Error:', error)
    } else {
      setProfiles(data)
    }
  }
  
  fetchData()
}, [])
```

**After:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const { data } = await supabaseAPI.getProfiles()
      setProfiles(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }
  
  fetchData()
}, [])
```

## Available API Methods

### Authentication
- `supabaseAPI.getUser()` - Get current user
- `supabaseAPI.signInWithEmail(email, password)` - Sign in
- `supabaseAPI.signOut()` - Sign out

### Database
- `supabaseAPI.getProfiles()` - Get all profiles
- `supabaseAPI.updateProfile(id, updates)` - Update profile
- `supabaseAPI.getForms()` - Get all forms
- `supabaseAPI.createForm(formData)` - Create new form
- `supabaseAPI.getFormResponses(formId)` - Get form responses

### Query Builder
- `supabaseAPI.from(table).select(columns).execute()` - Select data
- `supabaseAPI.from(table).select(columns).eq(column, value)` - Filter data
- `supabaseAPI.from(table).select(columns).limit(count)` - Limit results
- `supabaseAPI.from(table).insert(data).execute()` - Insert data
- `supabaseAPI.from(table).update(data).eq(column, value).execute()` - Update data

## Testing the Migration

Visit these test pages to verify everything works:

1. **`/proxy-test`** - Test the API proxy pattern
2. **`/api-test`** - Test individual API routes  
3. **`/client-comparison`** - Compare old vs new approach

## Performance Comparison

| Method | Response Time | Status |
|--------|---------------|--------|
| Direct Client-side | 5000ms+ | ❌ Timeout |
| API Proxy | 66ms | ✅ Success |
| Server-side | 66ms | ✅ Success |

## Next Steps

1. **Test the proxy**: Visit `/proxy-test` to verify it works
2. **Update components**: Replace direct Supabase calls with API proxy
3. **Test functionality**: Ensure all features work correctly
4. **Remove old imports**: Clean up unused direct Supabase imports

## Benefits

- ✅ **Reliable**: Uses proven working server-side connection
- ✅ **Fast**: 66ms response time vs 5+ second timeouts
- ✅ **Consistent**: Same API across all environments
- ✅ **Maintainable**: Centralized API logic in one place
- ✅ **Scalable**: Easy to add caching, rate limiting, etc.

## Need More API Routes?

If you need additional API routes, follow this pattern:

1. **Create API route** in `src/app/api/[endpoint]/route.ts`
2. **Add method** to `src/lib/supabase-api.ts`
3. **Test the endpoint** in `/proxy-test`
4. **Update components** to use the new method 