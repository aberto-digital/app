-- Troca links absolutos do Supabase cloud (fotos, capas, anexos) pelo endereço da VPS.
-- Percorre todas as colunas de texto/json do esquema public e os metadados dos usuários.
do $$
declare r record; n bigint; total bigint := 0;
  velho text := 'https://tnquehrbhonpivorkrqt.supabase.co/storage/';
  novo  text := 'https://api.tradingjourney.com.br/storage/';
begin
  for r in select c.table_schema s, c.table_name t, c.column_name col, c.data_type dt
             from information_schema.columns c join information_schema.tables tb
               on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
            where c.table_schema = 'public' and (c.data_type in ('text','character varying','jsonb','json') or c.udt_name in ('_text','_varchar'))
              and c.is_generated = 'NEVER' and c.is_updatable = 'YES'
  loop
    if r.dt in ('jsonb','json') then
      execute format('update %I.%I set %I = replace(%I::text, %L, %L)::%s where %I::text like %L',
        r.s, r.t, r.col, r.col, velho, novo, r.dt, r.col, '%'||velho||'%');
    elsif r.dt = 'ARRAY' then
      execute format('update %I.%I set %I = (replace(%I::text, %L, %L))::text[] where %I::text like %L',
        r.s, r.t, r.col, r.col, velho, novo, r.col, '%'||velho||'%');
    else
      execute format('update %I.%I set %I = replace(%I, %L, %L) where %I like %L',
        r.s, r.t, r.col, r.col, velho, novo, r.col, '%'||velho||'%');
    end if;
    get diagnostics n = row_count;
    if n > 0 then raise notice '%.%: % linhas', r.t, r.col, n; total := total + n; end if;
  end loop;
  update auth.users set raw_user_meta_data = replace(raw_user_meta_data::text, velho, novo)::jsonb
   where raw_user_meta_data::text like '%'||velho||'%';
  get diagnostics n = row_count;
  raise notice 'auth.users: % linhas; total public: %', n, total;
end $$;
