-- Návrhy kandidátov pre inzerát (anonymné): firma vidí zručnosti, hodiny, dostupnosť a % zhody,
-- ale NIE meno, fotku ani dátum narodenia — tie uvidí až keď študent sám dá „Mám záujem" (candidate_profiles).
-- Skóre: zhoda zručností s textom inzerátu + zhoda dostupnosti s typom brigády.

create or replace function public.suggest_candidates(p_posting bigint)
returns table (
  student_id  uuid,
  score       int,
  skills      text[],
  hours       smallint,
  avail_days  text[],
  avail_times text[],
  contacted   boolean,      -- firma ho už oslovila
  interested  boolean       -- študent už dal záujem (je aj v Brigádnikoch s menom)
)
language plpgsql security definer set search_path = public as $$
declare
  p postings%rowtype;
  hay text;
begin
  select * into p from postings where id = p_posting and company_id = auth.uid();
  if not found then return; end if;
  hay := lower(coalesce(p.title, '') || ' ' || coalesce(p.ai_note, '') || ' ' || coalesce(p.description, '') || ' ' || array_to_string(p.types, ' '));

  return query
  with st as (
    select s.id, s.hours, s.avail_days, s.avail_times, s.birth,
           array(select x->>'n' from jsonb_array_elements(s.skills) x) as names
    from students s
    where s.id <> auth.uid()
      and (not p.only18 or (s.birth is not null and s.birth <= current_date - interval '18 years'))
  ),
  scored as (
    select st.*,
      ( least((select count(*) from unnest(st.names) n where position(lower(n) in hay) > 0), 2) * 30
      + case when 'Víkendy'    = any(p.types) and st.avail_days  && array['So','Ne']  then 15 else 0 end
      + case when 'Poobede'    = any(p.types) and 'Poobede' = any(st.avail_times)     then 15 else 0 end
      + case when 'Večery'     = any(p.types) and 'Večer'   = any(st.avail_times)     then 15 else 0 end
      + case when 'Remote'     = any(p.types) then 5 else 0 end
      + case when 'Flexibilné' = any(p.types) and cardinality(st.avail_days) >= 4    then 10 else 0 end
      + case when cardinality(st.names) > 0 then 5 else 0 end
      )::int as sc
    from st
  )
  select scored.id, least(scored.sc, 99), scored.names, scored.hours, scored.avail_days, scored.avail_times,
         exists (select 1 from company_interests ci where ci.posting_id = p_posting and ci.student_id = scored.id),
         exists (select 1 from interests i where i.posting_id = p_posting and i.student_id = scored.id)
  from scored
  where scored.sc >= 20
  order by scored.sc desc
  limit 12;
end $$;

revoke all on function public.suggest_candidates(bigint) from public;
grant execute on function public.suggest_candidates(bigint) to authenticated;
