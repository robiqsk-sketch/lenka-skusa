-- Dátum narodenia študenta: (1) minimálny vek 16 rokov (ochrana osobných údajov §10),
-- (2) raz nastavený dátum sa už nedá zmeniť — ani cez API mimo appky.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create or replace function public.students_guard_birth() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.birth is not null and new.birth > current_date - interval '16 years' then
    raise exception 'Robiq je pre ľudí od 16 rokov.';
  end if;
  if tg_op = 'UPDATE' and old.birth is not null and new.birth is distinct from old.birth then
    raise exception 'Dátum narodenia sa nedá meniť.';
  end if;
  return new;
end $$;

drop trigger if exists students_guard_birth on public.students;
create trigger students_guard_birth before insert or update on public.students
  for each row execute function public.students_guard_birth();
