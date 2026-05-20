create table if not exists quiz_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  session_id  text not null,
  event       text not null,  -- 'step_view' | 'step_complete' | 'quiz_complete' | 'plan_generated'
  step        integer         -- 0-4, null for quiz_complete / plan_generated
);

create index quiz_events_created_at_idx on quiz_events (created_at desc);
create index quiz_events_session_idx    on quiz_events (session_id);

-- Widok funnela: ile unikalnych sesji dotarło do każdego kroku
create or replace view quiz_funnel as
select
  step,
  count(distinct session_id) as sessions
from quiz_events
where event = 'step_view'
group by step
order by step;
