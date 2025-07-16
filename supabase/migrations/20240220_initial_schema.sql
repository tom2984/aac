-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types
create type question_type as enum (
    'text',
    'textarea',
    'number',
    'select',
    'multiselect',
    'date',
    'time',
    'datetime',
    'file',
    'image',
    'location',
    'signature'
);

-- Create forms table
create table forms (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    is_active boolean default true,
    is_public boolean default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settings jsonb default '{}'::jsonb,
    metadata jsonb default '{}'::jsonb
);

-- Create form_questions table
create table form_questions (
    id uuid primary key default uuid_generate_v4(),
    form_id uuid references forms(id) on delete cascade not null,
    question_text text not null,
    question_type question_type not null,
    is_required boolean default false,
    order_index integer not null,
    options jsonb default '[]'::jsonb, -- For select/multiselect questions
    validation_rules jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    metadata jsonb default '{}'::jsonb,
    constraint unique_question_order unique (form_id, order_index)
);

-- Create form_responses table
create table form_responses (
    id uuid primary key default uuid_generate_v4(),
    form_id uuid references forms(id) on delete cascade not null,
    respondent_id uuid references auth.users(id) on delete set null,
    status text default 'completed'::text,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    submitted_at timestamp with time zone,
    metadata jsonb default '{}'::jsonb
);

-- Create form_response_answers table
create table form_response_answers (
    id uuid primary key default uuid_generate_v4(),
    response_id uuid references form_responses(id) on delete cascade not null,
    question_id uuid references form_questions(id) on delete cascade not null,
    answer jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_response_question unique (response_id, question_id)
);

-- Create indexes for better query performance
create index idx_forms_created_by on forms(created_by);
create index idx_form_questions_form_id on form_questions(form_id);
create index idx_form_responses_form_id on form_responses(form_id);
create index idx_form_responses_respondent_id on form_responses(respondent_id);
create index idx_form_response_answers_response_id on form_response_answers(response_id);
create index idx_form_response_answers_question_id on form_response_answers(question_id);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_forms_updated_at
    before update on forms
    for each row
    execute function update_updated_at_column();

create trigger update_form_questions_updated_at
    before update on form_questions
    for each row
    execute function update_updated_at_column();

create trigger update_form_response_answers_updated_at
    before update on form_response_answers
    for each row
    execute function update_updated_at_column();

-- Set up Row Level Security (RLS)
alter table forms enable row level security;
alter table form_questions enable row level security;
alter table form_responses enable row level security;
alter table form_response_answers enable row level security;

-- Create policies
-- Forms policies
create policy "Forms are viewable by creator and public if is_public"
    on forms for select
    using (
        auth.uid() = created_by or
        is_public = true
    );

create policy "Forms are insertable by authenticated users"
    on forms for insert
    with check (auth.role() = 'authenticated');

create policy "Forms are updatable by creator"
    on forms for update
    using (auth.uid() = created_by);

create policy "Forms are deletable by creator"
    on forms for delete
    using (auth.uid() = created_by);

-- Form questions policies
create policy "Form questions are viewable by form creator and if form is public"
    on form_questions for select
    using (
        exists (
            select 1 from forms
            where forms.id = form_questions.form_id
            and (forms.created_by = auth.uid() or forms.is_public = true)
        )
    );

create policy "Form questions are insertable by form creator"
    on form_questions for insert
    with check (
        exists (
            select 1 from forms
            where forms.id = form_questions.form_id
            and forms.created_by = auth.uid()
        )
    );

create policy "Form questions are updatable by form creator"
    on form_questions for update
    using (
        exists (
            select 1 from forms
            where forms.id = form_questions.form_id
            and forms.created_by = auth.uid()
        )
    );

create policy "Form questions are deletable by form creator"
    on form_questions for delete
    using (
        exists (
            select 1 from forms
            where forms.id = form_questions.form_id
            and forms.created_by = auth.uid()
        )
    );

-- Form responses policies
create policy "Form responses are viewable by form creator and respondent"
    on form_responses for select
    using (
        exists (
            select 1 from forms
            where forms.id = form_responses.form_id
            and forms.created_by = auth.uid()
        ) or
        respondent_id = auth.uid()
    );

create policy "Form responses are insertable by authenticated users"
    on form_responses for insert
    with check (auth.role() = 'authenticated');

create policy "Form responses are updatable by respondent"
    on form_responses for update
    using (respondent_id = auth.uid());

-- Form response answers policies
create policy "Form response answers are viewable by form creator and respondent"
    on form_response_answers for select
    using (
        exists (
            select 1 from form_responses
            join forms on forms.id = form_responses.form_id
            where form_responses.id = form_response_answers.response_id
            and (forms.created_by = auth.uid() or form_responses.respondent_id = auth.uid())
        )
    );

create policy "Form response answers are insertable by respondent"
    on form_response_answers for insert
    with check (
        exists (
            select 1 from form_responses
            where form_responses.id = form_response_answers.response_id
            and form_responses.respondent_id = auth.uid()
        )
    );

create policy "Form response answers are updatable by respondent"
    on form_response_answers for update
    using (
        exists (
            select 1 from form_responses
            where form_responses.id = form_response_answers.response_id
            and form_responses.respondent_id = auth.uid()
        )
    );

console.log('Aggregated daysLostData:', result); 