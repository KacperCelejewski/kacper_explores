create table if not exists gemini_usage_log (
  id            bigserial primary key,
  called_at     timestamptz not null default now(),
  endpoint      text not null,
  model         text not null,
  success       boolean not null,
  error_code    text,
  input_tokens  integer,
  output_tokens integer
);

create index gemini_usage_log_called_at_idx on gemini_usage_log (called_at desc);
