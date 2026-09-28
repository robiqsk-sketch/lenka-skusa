-- Meno kontaktnej osoby firmy (companies.contact_name) nesmie byť verejné.
-- Doteraz: pravidlo "companies: public read" + plné právo SELECT pre anon/authenticated → ktokoľvek
-- s verejným kľúčom si ho vedel prečítať. RLS stráži riadky, nie stĺpce, preto to riešia práva na stĺpce.
--
-- Po migrácii: anon aj authenticated čítajú z companies len vymenované stĺpce. contact_name
-- nečíta nikto z klienta (ani firma sama — appka ho späť nepotrebuje); admin ho vidí cez admin_companies().
-- Zápis (insert/update vlastnej firmy) sa nemení.
--
-- POZOR: nový stĺpec v companies nebude pre appku čitateľný, kým ho nedoplníš do grant-u nižšie.
-- POZOR 2: upsert nesmie obsahovať contact_name (ON CONFLICT číta excluded.contact_name = potrebuje SELECT).
--          app.js ho preto zapisuje samostatným update-om. Najprv nasadiť app.js, až potom spustiť túto migráciu.
-- Spustiť v Supabase → SQL Editor → New query → Run.

revoke select on public.companies from anon, authenticated;
grant select (id, name, legal_name, ico, fields, description, logo_url, city_id, verified, updated_at)
  on public.companies to anon, authenticated;

-- kontrola: má vrátiť false, false
select has_column_privilege('anon', 'public.companies', 'contact_name', 'SELECT')          as anon_vidi_kontakt,
       has_column_privilege('authenticated', 'public.companies', 'contact_name', 'SELECT') as prihlaseny_vidi_kontakt;
