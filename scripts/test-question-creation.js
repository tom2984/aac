const { createClient } = require('@supabase/supabase-js');

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl ? 'Present' : 'Missing');
  console.log('SUPABASE_SERVICE_KEY:', !!supabaseKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuestionCreation() {
  console.log('🧪 Testing question type creation...\n');

  // Test question types to verify mapping
  const testQuestionTypes = [
    'text', 'textarea', 'number', 'select', 'multiselect', 
    'date', 'time', 'datetime', 'file', 'image', 'location', 
    'signature', 'composite'
  ];

  // First, let's check what types are actually valid in the database
  console.log('📋 Checking valid question types in database...');
  
  try {
    const { data: enumData, error: enumError } = await supabase
      .rpc('enum_range', { enum_type: 'question_type' });

    if (enumError) {
      console.log('⚠️ Could not fetch enum values:', enumError.message);
    } else {
      console.log('✅ Valid question types from database:', enumData);
    }
  } catch (error) {
    console.log('⚠️ Could not check enum values:', error.message);
  }

  // Test if we can create a simple form first
  console.log('\n📝 Creating test form...');
  
  const { data: formData, error: formError } = await supabase
    .from('forms')
    .insert([{
      title: 'Test Form - ' + new Date().toISOString(),
      description: 'Test form for question creation debugging',
      created_by: '00000000-0000-0000-0000-000000000000', // dummy user for testing
      settings: {},
      metadata: {}
    }])
    .select()
    .single();

  if (formError) {
    console.error('❌ Failed to create test form:', formError);
    return;
  }

  console.log('✅ Test form created:', formData.id);

  // Test each question type
  console.log('\n🔍 Testing question types...');
  
  for (const questionType of testQuestionTypes) {
    const questionData = {
      form_id: formData.id,
      question_text: `Test ${questionType} question`,
      question_type: questionType,
      is_required: false,
      order_index: testQuestionTypes.indexOf(questionType),
      options: ['select', 'multiselect'].includes(questionType) 
        ? JSON.stringify(['Option 1', 'Option 2']) 
        : '[]'
    };

    const { data: questionResult, error: questionError } = await supabase
      .from('form_questions')
      .insert([questionData])
      .select();

    if (questionError) {
      console.log(`❌ ${questionType}: Failed - ${questionError.message} (Code: ${questionError.code})`);
    } else {
      console.log(`✅ ${questionType}: Success`);
    }
  }

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  
  const { error: deleteError } = await supabase
    .from('forms')
    .delete()
    .eq('id', formData.id);

  if (deleteError) {
    console.log('⚠️ Failed to clean up test form:', deleteError.message);
  } else {
    console.log('✅ Test form cleaned up');
  }

  console.log('\n📊 Question creation test completed!');
  console.log('\n💡 If some question types failed:');
  console.log('1. Check if the database enum includes all expected values');
  console.log('2. Try running scripts/disable-form-questions-rls.sql if RLS is blocking');
  console.log('3. Verify your environment variables are correct');
  console.log('4. Check the logs above for specific error codes and messages');
}

// Alternative test with manual enum check
async function checkDatabaseSchema() {
  console.log('\n🔍 Checking database schema directly...');

  // Try to get enum values using a raw SQL query
  try {
    const { data, error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', supabase.from('pg_type').select('oid').eq('typname', 'question_type'));

    if (error) {
      console.log('❌ Could not check enum via pg_enum:', error.message);
    } else {
      console.log('✅ Enum values found:', data);
    }
  } catch (error) {
    console.log('❌ Schema check failed:', error.message);
  }

  // Check if form_questions table exists and its structure
  try {
    const { data, error } = await supabase
      .from('form_questions')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ form_questions table issue:', error.message);
    } else {
      console.log('✅ form_questions table is accessible');
    }
  } catch (error) {
    console.log('❌ form_questions table check failed:', error.message);
  }
}

// Run the tests
async function main() {
  console.log('🚀 Starting question creation diagnostics...\n');
  
  await checkDatabaseSchema();
  await testQuestionCreation();
  
  process.exit(0);
}

main().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
}); 