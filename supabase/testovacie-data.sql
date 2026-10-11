-- Testovacie dáta: 10 firiem, 20 inzerátov a 16 brigádnikov, aby web nebol prázdny.
-- Nie je to migrácia (schéma sa nemení) — len dáta. Spustiť: Supabase → SQL Editor → Run.
-- Opakované spustenie nič nezdvojí (účet sa hľadá podľa e-mailu, inzerát podľa firmy a názvu).
--
-- Všetky účty majú e-mail test.…@robiq.sk, NEMAJÚ heslo (nedá sa do nich prihlásiť), firmy nie sú overené
-- a do štatistiky sa nerátajú (stats_excluded). Zmazanie všetkého je na konci súboru.
-- Pozri docs/Databáza/Testovacie dáta.md.

begin;

-- ── 1) Účty ─────────────────────────────────────────────────────────────────────────────
-- Trigger handle_new_user z metadát (ako pri registrácii v appke) vytvorí profil a riadok vo firmách / študentoch.
with acc(email, days, meta) as (values
  -- firmy
  ('test.firma.zelenamiska@robiq.sk', 20, '{"role":"firm","name":"Bistro Zelená miska","fields":["Gastro"],"contact_name":"Zuzana Kováčová","city_id":1}'),
  ('test.firma.pekaren@robiq.sk',     19, '{"role":"firm","name":"Pekáreň U Mlynára","fields":["Gastro","Retail"],"contact_name":"Ján Mlynárik","city_id":10}'),
  ('test.firma.sklad@robiq.sk',       18, '{"role":"firm","name":"Expres Sklad Senec","fields":["Sklad a logistika"],"contact_name":"Marek Danko","city_id":4}'),
  ('test.firma.eventy@robiq.sk',      17, '{"role":"firm","name":"Eventy Na Plno","fields":["Eventy"],"contact_name":"Ivana Krejčí","city_id":1}'),
  ('test.firma.knihy@robiq.sk',       16, '{"role":"firm","name":"Kníhkupectvo Strana 42","fields":["Retail"],"contact_name":"Monika Hrušková","city_id":70}'),
  ('test.firma.sova@robiq.sk',        15, '{"role":"firm","name":"Doučovanie Sova","fields":["Doučovanie"],"contact_name":"Andrea Fedorová","city_id":130}'),
  ('test.firma.pixel@robiq.sk',       14, '{"role":"firm","name":"Štúdio Pixel & Pero","fields":["IT a dizajn"],"contact_name":"Richard Bella","city_id":90}'),
  ('test.firma.penzion@robiq.sk',     13, '{"role":"firm","name":"Penzión Smrekový dvor","fields":["Gastro"],"contact_name":"Erika Gallová","city_id":111}'),
  ('test.firma.cistota@robiq.sk',     12, '{"role":"firm","name":"Upratovanie Čistota","fields":["Manuálna práca"],"contact_name":"Jozef Benko","city_id":50}'),
  ('test.firma.ucto@robiq.sk',        11, '{"role":"firm","name":"Účto Plus","fields":["Administratíva"],"contact_name":"Katarína Šoltésová","city_id":110}'),
  -- brigádnici (zručnosti: lvl 1–3 = Základy / Dobré / Top, pri jazykoch A1–A2 / B1–B2 / C1–C2; hours = index do HOURS v data.js)
  ('test.student.tomas@robiq.sk',   10, '{"role":"student","name":"Tomáš Horváth","birth":"2004-03-14","city_id":1,"commute":"30km","hours":2,"avail_days":["Po","St","Pi","So"],"avail_times":["Poobede","Večer"],"fields":["Gastro"],"bio":"Študujem na STU a popri škole druhý rok robím baristu.","skills":[{"n":"Barista","lvl":3,"speak":true},{"n":"Čašník / Servírka","lvl":2,"speak":true},{"n":"Angličtina","lvl":2,"speak":true},{"n":"Komunikatívnosť","lvl":2,"speak":true}]}'),
  ('test.student.simona@robiq.sk',  10, '{"role":"student","name":"Simona Vargová","birth":"2005-07-02","city_id":10,"commute":"15km","hours":1,"avail_days":["So","Ne"],"avail_times":["Ráno","Poobede"],"fields":["Retail","Gastro"],"bio":"Cez víkendy mám čas, cez týždeň škola.","skills":[{"n":"Predaj","lvl":2,"speak":true},{"n":"Pokladňa","lvl":2,"speak":true},{"n":"Spoľahlivosť","lvl":2,"speak":true},{"n":"Nemčina","lvl":1,"speak":true}]}'),
  ('test.student.martin@robiq.sk',   9, '{"role":"student","name":"Martin Novák","birth":"2003-11-20","city_id":4,"commute":"30km","hours":3,"avail_days":["Po","Ut","St","Št","Pi"],"avail_times":["Ráno","Poobede"],"fields":["Sklad a logistika","Manuálna práca"],"bio":"Mám vlastné auto, nevadí mi fyzická práca.","skills":[{"n":"Sklad","lvl":3,"speak":true},{"n":"Vodičský preukaz B","lvl":2,"speak":true},{"n":"Fyzická kondícia","lvl":3,"speak":true},{"n":"Vlastné auto","lvl":2,"speak":true}]}'),
  ('test.student.natalia@robiq.sk',  9, '{"role":"student","name":"Natália Kollárová","birth":"2006-01-09","city_id":1,"commute":"any","hours":1,"avail_days":["Pi","So","Ne"],"avail_times":["Večer"],"fields":["Eventy"],"bio":"Rada robím na akciách medzi ľuďmi.","skills":[{"n":"Hostesing","lvl":2,"speak":true},{"n":"Eventy","lvl":2,"speak":true},{"n":"Angličtina","lvl":3,"speak":true},{"n":"Komunikatívnosť","lvl":3,"speak":true}]}'),
  ('test.student.jakub@robiq.sk',    8, '{"role":"student","name":"Jakub Baláž","birth":"2007-05-30","city_id":70,"commute":"15km","hours":1,"avail_days":["Ut","Št","So"],"avail_times":["Poobede"],"fields":["Retail"],"bio":"","skills":[{"n":"Predaj","lvl":1,"speak":true},{"n":"Organizovanosť","lvl":2,"speak":true},{"n":"Angličtina","lvl":2,"speak":true}]}'),
  ('test.student.ema@robiq.sk',      8, '{"role":"student","name":"Ema Šimková","birth":"2004-09-17","city_id":130,"commute":"city","hours":1,"avail_days":["Po","Ut","St","Št"],"avail_times":["Poobede"],"fields":["Doučovanie"],"bio":"Študujem učiteľstvo matematiky a angličtiny.","skills":[{"n":"Doučovanie","lvl":3,"speak":true},{"n":"Matematika","lvl":3,"speak":true},{"n":"Angličtina","lvl":3,"speak":true},{"n":"Rýchle učenie","lvl":2,"speak":true}]}'),
  ('test.student.filip@robiq.sk',    7, '{"role":"student","name":"Filip Lukáč","birth":"2005-02-11","city_id":90,"commute":"any","hours":2,"avail_days":["Po","Ut","St","Št","Pi","So","Ne"],"avail_times":["Poobede","Večer"],"fields":["IT a dizajn"],"bio":"Strihám videá pre kamarátov aj pre školský časopis.","skills":[{"n":"Video strih","lvl":3,"speak":true},{"n":"Sociálne siete","lvl":2,"speak":true},{"n":"Canva","lvl":2,"speak":true},{"n":"Kreativita","lvl":3,"speak":true}]}'),
  ('test.student.veronika@robiq.sk', 7, '{"role":"student","name":"Veronika Hudáková","birth":"2003-06-25","city_id":111,"commute":"30km","hours":3,"avail_days":["Pi","So","Ne"],"avail_times":["Ráno","Poobede","Večer"],"fields":["Gastro"],"bio":"Tri sezóny som robila v hoteli v Tatrách.","skills":[{"n":"Čašník / Servírka","lvl":3,"speak":true},{"n":"Recepcia","lvl":2,"speak":true},{"n":"Nemčina","lvl":2,"speak":true},{"n":"Angličtina","lvl":2,"speak":true}]}'),
  ('test.student.samuel@robiq.sk',   6, '{"role":"student","name":"Samuel Mráz","birth":"2008-12-03","city_id":50,"commute":"city","hours":0,"avail_days":["St","So"],"avail_times":["Poobede"],"fields":["Manuálna práca"],"bio":"","skills":[{"n":"Upratovanie","lvl":2,"speak":true},{"n":"Spoľahlivosť","lvl":2,"speak":true},{"n":"Fyzická kondícia","lvl":2,"speak":true}]}'),
  ('test.student.kristina@robiq.sk', 6, '{"role":"student","name":"Kristína Oravcová","birth":"2002-10-01","city_id":110,"commute":"15km","hours":2,"avail_days":["Po","Ut","St","Št","Pi"],"avail_times":["Ráno"],"fields":["Administratíva"],"bio":"Posledný ročník ekonomiky, Excel je môj kamarát.","skills":[{"n":"Administratíva","lvl":2,"speak":true},{"n":"Excel","lvl":3,"speak":true},{"n":"Organizovanosť","lvl":3,"speak":true},{"n":"Fakturácia","lvl":1,"speak":true}]}'),
  ('test.student.adam@robiq.sk',     5, '{"role":"student","name":"Adam Kučera","birth":"2006-08-08","city_id":1,"commute":"15km","hours":1,"avail_days":["So","Ne"],"avail_times":["Ráno","Poobede"],"fields":["Gastro","Manuálna práca"],"bio":"","skills":[{"n":"Kuchyňa","lvl":2,"speak":true},{"n":"Práca v tíme","lvl":2,"speak":true},{"n":"Fyzická kondícia","lvl":2,"speak":true}]}'),
  ('test.student.lucia@robiq.sk',    5, '{"role":"student","name":"Lucia Poláková","birth":"2005-04-19","city_id":30,"commute":"30km","hours":1,"avail_days":["Pi","So"],"avail_times":["Poobede","Večer"],"fields":["Gastro","Retail"],"bio":"Káva je moja láska, rada sa učím nové veci.","skills":[{"n":"Barista","lvl":2,"speak":true},{"n":"Pokladňa","lvl":1,"speak":true},{"n":"Komunikatívnosť","lvl":2,"speak":true},{"n":"Taliančina","lvl":1,"speak":true}]}'),
  ('test.student.dominik@robiq.sk',  4, '{"role":"student","name":"Dominik Sloboda","birth":"2004-01-27","city_id":3,"commute":"30km","hours":2,"avail_days":["Po","St","Pi","So"],"avail_times":["Večer","Nočné zmeny"],"fields":["Sklad a logistika","Eventy"],"bio":"Nočné zmeny mi nevadia.","skills":[{"n":"Sklad","lvl":2,"speak":true},{"n":"Eventy","lvl":1,"speak":true},{"n":"Fyzická kondícia","lvl":3,"speak":true},{"n":"Vodičský preukaz B","lvl":2,"speak":true}]}'),
  ('test.student.michaela@robiq.sk', 3, '{"role":"student","name":"Michaela Bartošová","birth":"2007-03-05","city_id":71,"commute":"any","hours":1,"avail_days":["Ut","Št"],"avail_times":["Poobede"],"fields":["IT a dizajn"],"bio":"Kreslím a robím grafiku, rada aj z domu.","skills":[{"n":"Grafika","lvl":2,"speak":true},{"n":"Figma","lvl":2,"speak":true},{"n":"Canva","lvl":3,"speak":true},{"n":"Photoshop","lvl":1,"speak":true}]}'),
  ('test.student.patrik@robiq.sk',   2, '{"role":"student","name":"Patrik Ondrejka","birth":"2003-08-12","city_id":130,"commute":"30km","hours":2,"avail_days":["So","Ne"],"avail_times":["Ráno","Poobede"],"fields":["Sklad a logistika"],"bio":"","skills":[{"n":"Kuriér","lvl":2,"speak":true},{"n":"Rozvoz","lvl":2,"speak":true},{"n":"Vodičský preukaz B","lvl":3,"speak":true}]}'),
  ('test.student.barbora@robiq.sk',  1, '{"role":"student","name":"Barbora Krajčírová","birth":"2006-11-28","city_id":70,"commute":"30km","hours":1,"avail_days":["Po","St","So"],"avail_times":["Poobede"],"fields":["Retail","IT a dizajn"],"bio":"Píšem blog o knihách.","skills":[{"n":"Predaj","lvl":2,"speak":true},{"n":"Copywriting","lvl":2,"speak":true},{"n":"Sociálne siete","lvl":2,"speak":true},{"n":"Angličtina","lvl":2,"speak":true}]}')
)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       a.email, '', now(), '{"provider":"email","providers":["email"]}', a.meta::jsonb,
       now() - make_interval(days => a.days), now(), '', '', '', ''
from acc a
where not exists (select 1 from auth.users u where lower(u.email) = a.email);

-- ── 2) Popis firiem ─────────────────────────────────────────────────────────────────────
update companies c set description = v.d, updated_at = now()
from (values
  ('test.firma.zelenamiska@robiq.sk', 'Malé bistro v centre — denné menu, šaláty a polievky z čerstvých surovín.'),
  ('test.firma.pekaren@robiq.sk',     'Rodinná pekáreň, chlieb pečieme z kvásku každé ráno od štvrtej.'),
  ('test.firma.sklad@robiq.sk',       'Sklad pre e-shopy — balíme a posielame objednávky po celom Slovensku.'),
  ('test.firma.eventy@robiq.sk',      'Organizujeme koncerty, plesy, veľtrhy a firemné akcie.'),
  ('test.firma.knihy@robiq.sk',       'Nezávislé kníhkupectvo s kaviarenským kútikom.'),
  ('test.firma.sova@robiq.sk',        'Doučovanie pre žiakov základných a stredných škôl, osobne aj online.'),
  ('test.firma.pixel@robiq.sk',       'Malé kreatívne štúdio — sociálne siete, videá a grafika pre menšie firmy.'),
  ('test.firma.penzion@robiq.sk',     'Rodinný penzión s reštauráciou pod Tatrami, 14 izieb.'),
  ('test.firma.cistota@robiq.sk',     'Upratujeme kancelárie a spoločné priestory bytových domov.'),
  ('test.firma.ucto@robiq.sk',        'Účtovná kancelária pre živnostníkov a malé firmy.')
) v(email, d)
join auth.users u on lower(u.email) = v.email
where c.id = u.id;

-- ── 3) Inzeráty ─────────────────────────────────────────────────────────────────────────
-- city_id: 1 Bratislava · 4 Senec · 10 Trnava · 50 Nitra · 70 Žilina · 90 Banská Bystrica · 110 Prešov · 111 Poprad · 130 Košice
insert into postings (company_id, title, pay, need, types, only18, city_id, remote, description, ai_note, created_at)
select u.id, v.title, v.pay, v.need, v.types, v.only18, v.city_id, v.remote, v.descr, v.ai_note,
       now() - make_interval(days => v.days, hours => v.hrs)
from (values
  ('test.firma.zelenamiska@robiq.sk', 'Pomocná sila do kuchyne', '8,50', 2, array['Poobede','Flexibilné'], false, 1, false,
   'Pomôžeš s prípravou zeleniny, šalátov a s umývaním riadu počas obedov. Zmeny 10–15 h, aspoň dva dni v týždni — dni si vyberieš sám. Jedlo počas zmeny zadarmo.',
   'kuchyňa, rýchlosť, hygiena', 14, 3),
  ('test.firma.zelenamiska@robiq.sk', 'Obsluha za pultom — obedové menu', '8', 1, array['Poobede'], false, 1, false,
   'Výdaj jedál, pokladňa a úsmev pre stálych zákazníkov. Hodí sa, ak sa nebojíš rušnej obedňajšej hodiny. Zaučíme ťa za jeden deň.',
   'pokladňa, obsluha, komunikatívnosť', 6, 5),
  ('test.firma.pekaren@robiq.sk', 'Predaj v pekárni — víkendové rána', '7,80', 2, array['Víkendy'], false, 10, false,
   'Sobota a nedeľa od 6:00 do 12:00. Predaj pečiva, káva so sebou a dopĺňanie pultu. Čerstvé pečivo domov po každej zmene.',
   'predaj, pokladňa, ranné vstávanie', 12, 8),
  ('test.firma.sklad@robiq.sk', 'Balenie e-shopových objednávok', '9', 5, array['Flexibilné','Večery'], false, 4, false,
   'Kompletizácia a balenie objednávok v čistom a vykurovanom sklade. Zmeny 4–8 hodín, aj poobede a večer. Ku skladu chodí autobus z Bratislavy.',
   'sklad, balenie, presnosť', 11, 2),
  ('test.firma.sklad@robiq.sk', 'Vodič dodávky — rozvoz balíkov', '10,50', 2, array['Flexibilné'], true, 4, false,
   'Rozvoz balíkov po Senci a okolí s firemnou dodávkou do 3,5 t. Treba vodičský preukaz B aspoň rok. Trasu ukáže navigácia, s nakladaním pomôžu kolegovia zo skladu.',
   'vodičský preukaz B, rozvoz, orientácia', 4, 6),
  ('test.firma.sklad@robiq.sk', 'Nočná inventúra skladu', '11', 6, array['Večery'], true, 4, false,
   'Jednorazová inventúra v noci z piatka na sobotu (22:00–6:00). Počítanie tovaru so skenerom, všetko vysvetlíme na mieste. Za nočnú zmenu príplatok.',
   'sklad, inventúra, nočné zmeny', 2, 1),
  ('test.firma.eventy@robiq.sk', 'Hostesky a hostesovia na veľtrh', '10', 6, array['Víkendy'], false, 1, false,
   'Vítanie návštevníkov, registrácia a rozdávanie materiálov počas víkendového veľtrhu na výstavisku. Oblečenie dodáme. Výhodou je angličtina.',
   'hostesing, angličtina, komunikatívnosť', 10, 4),
  ('test.firma.eventy@robiq.sk', 'Stavba pódia na koncerty', '9,50', 8, array['Víkendy'], true, 1, false,
   'Stavba a búranie pódia a stánkov na koncerty a firemné akcie. Fyzicky náročnejšie, ale v partii to letí. Rukavice a obed zabezpečíme.',
   'eventy, stavba pódia, fyzická kondícia', 7, 9),
  ('test.firma.eventy@robiq.sk', 'Šatniar/ka na plesovú sezónu', '8', 4, array['Večery','Víkendy'], false, 1, false,
   'Plesy a večierky od novembra do februára, piatok a sobota večer. Úschova kabátov a výdaj lístkov.',
   'eventy, šatňa, spoľahlivosť', 1, 7),
  ('test.firma.knihy@robiq.sk', 'Predaj a pokladňa v kníhkupectve', '7,50', 1, array['Poobede','Víkendy'], false, 70, false,
   'Poradíš zákazníkom, zabalíš darček a vybavíš pokladňu. Pred Vianocami je viac práce, preto hľadáme niekoho aj na december. Zľava na knihy.',
   'predaj, pokladňa, knihy', 9, 3),
  ('test.firma.sova@robiq.sk', 'Online doučovanie matematiky pre ZŠ', '12', 3, array['Remote','Poobede','Flexibilné'], false, null, true,
   'Doučuj žiakov 5.–9. ročníka cez videohovor. Čas si dohodneš priamo s rodičmi, materiály dostaneš od nás. Stačí notebook a trpezlivosť.',
   'doučovanie, matematika', 13, 2),
  ('test.firma.sova@robiq.sk', 'Angličtina pre deti — krúžok', '11', 1, array['Poobede'], false, 130, false,
   'Dvakrát týždenne poobede hodina angličtiny pre deti 6–10 rokov hravou formou. Hodí sa úroveň B2 a chuť pracovať s deťmi.',
   'doučovanie, angličtina, deti', 5, 4),
  ('test.firma.pixel@robiq.sk', 'Správa Instagramu a TikToku', '10', 1, array['Remote','Flexibilné'], false, null, true,
   'Plánovanie príspevkov, odpovede na komentáre a nápady na krátke videá pre troch menších klientov. Pracuješ z domu, raz týždenne krátky online meeting.',
   'sociálne siete, tiktok, kreativita', 8, 6),
  ('test.firma.pixel@robiq.sk', 'Strih krátkych videí (Reels)', '11', 2, array['Remote','Flexibilné'], false, null, true,
   'Zo surových záberov strihneš 15–60-sekundové videá s titulkami. CapCut alebo Premiere — je nám jedno, hlavne nech to má tempo.',
   'video strih, reels, capcut', 3, 2),
  ('test.firma.pixel@robiq.sk', 'Grafika do Canvy pre e-shop', '9', 1, array['Flexibilné'], false, 90, false,
   'Bannery, produktové obrázky a príspevky podľa hotového vizuálu. Šablóny máme, hľadáme niekoho s citom pre detail.',
   'canva, grafika', 6, 1),
  ('test.firma.penzion@robiq.sk', 'Čašník / servírka — zimná sezóna', '8,50', 3, array['Víkendy','Večery'], false, 111, false,
   'Obsluha v reštaurácii penziónu od decembra do marca, hlavne víkendy a sviatky. Strava počas zmeny, pri dlhších zmenách aj ubytovanie.',
   'čašník, obsluha, nemčina', 12, 5),
  ('test.firma.penzion@robiq.sk', 'Recepcia — víkendové služby', '8', 1, array['Víkendy'], false, 111, false,
   'Príchody a odchody hostí, telefóny a rezervácie. Hodí sa nemčina alebo angličtina, rezervačný systém ťa naučíme.',
   'recepcia, nemčina, angličtina', 2, 8),
  ('test.firma.cistota@robiq.sk', 'Upratovanie kancelárií po pracovnej dobe', '8', 3, array['Večery'], false, 50, false,
   'Upratovanie kancelárií v centre Nitry od 18:00, 2–3 hodiny denne. Pomôcky a čistiace prostriedky máme. Vhodné aj popri škole.',
   'upratovanie, spoľahlivosť', 9, 7),
  ('test.firma.ucto@robiq.sk', 'Administratíva a skenovanie dokladov', '8,50', 1, array['Poobede','Flexibilné'], false, 110, false,
   'Triedenie a skenovanie dokladov, jednoduché zápisy do tabuliek. Pokojná kancelária, hodiny podľa tvojho rozvrhu.',
   'administratíva, excel, presnosť', 7, 3),
  ('test.firma.ucto@robiq.sk', 'Zadávanie dát do Excelu z domu', '9', 2, array['Remote','Flexibilné'], false, null, true,
   'Prepis údajov z faktúr do tabuliek podľa vzoru. Presnosť je dôležitejšia než rýchlosť. Stačí vlastný notebook.',
   'excel, administratíva, presnosť', 0, 5)
) v(email, title, pay, need, types, only18, city_id, remote, descr, ai_note, days, hrs)
join auth.users u on lower(u.email) = v.email
where not exists (select 1 from postings p where p.company_id = u.id and p.title = v.title);

-- ── 4) Záujmy o inzeráty testovacej firmy „Kaviareň Test" (firma.test@robiq.sk) ───────────────────
-- Po prihlásení ako firma.test uvidíš v záložke Brigádnici ľudí, ktorí majú o jej inzeráty záujem.
insert into interests (posting_id, student_id, created_at)
select p.id, u.id, now() - make_interval(hours => v.hrs)
from (values
  ('test.student.tomas@robiq.sk',     'Barista — víkendy',   30),
  ('test.student.lucia@robiq.sk',     'Barista — víkendy',   20),
  ('test.student.veronika@robiq.sk',  'Barista — víkendy',   12),
  ('test.student.simona@robiq.sk',    'Barista — víkendy',    5),
  ('test.student.tomas@robiq.sk',     'Barista do kaviarne', 28),
  ('test.student.adam@robiq.sk',      'Barista do kaviarne',  3)
) v(email, title, hrs)
join auth.users u on lower(u.email) = v.email
join auth.users f on lower(f.email) = 'firma.test@robiq.sk'
join postings p on p.company_id = f.id and p.title = v.title
on conflict (posting_id, student_id) do nothing;

-- ── 5) Do štatistiky sa nerátajú ─────────────────────────────────────────────────────────
insert into stats_excluded (email)
select email from auth.users where email like 'test.%@robiq.sk'
on conflict (email) do nothing;

commit;

-- ── Zmazanie všetkých testovacích dát ─────────────────────────────────────────────────────
-- Zmazanie účtu kaskádovo zmaže aj profil, firmu, jej inzeráty, študenta a jeho záujmy.
-- delete from stats_excluded where email like 'test.%@robiq.sk';
-- delete from auth.users      where email like 'test.%@robiq.sk';
