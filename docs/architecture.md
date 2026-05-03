ring - how it works

ok so the idea is super simple.

what happens

user comes to landing page, drops phone number. our AI calls them in like 10 sec. AI asks couple questions (name, age, city, what u want, ideal date, 1 friend who can vouch). we save what they said. we send them email with all the info.

thats it. one page, one call, one email.

what we use

Next.js for the website (already done). Supabase for database (already done). Vapi for the AI call, this is the main one, it does the voice + AI + transcript for us. if we build it ourselfs from scratch with openai + twilio its like 2 weeks, with vapi its 1 day, so we use vapi. Resend for sending email, its easy.

how it works in code

ok so basically. user types phone on landing, hits the button. it goes to our backend at /api/intake. we save the lead in db and tell vapi hey call this number. vapi calls the user. they talk. user hangs up. vapi pings us back at /api/webhooks/vapi with the transcript and the answers. we save it all and fire off the email.

so its really just 2 endpoints. one to start the call, one to catch the result. nothing crazy.

database

2 tables only. Lead is phone + status (waiting / calling / done). Call is transcript + answers (as json) + recording link.

how matching works

4 steps. funnel. cheap stuff first, AI last.

40 ppl. filter by gender, age, what they want. 20 ppl left. score math (hobby overlap, dealbreakers, mutal fit). top 10. embeddings (catches loves dogs = outdoorsy). top 3. gpt-5-nano gets those 3 with their scores, picks one, writes the email copy (cafe, time, pitch). email out.

big thing: math ranks the top 3 by score. AI defaults to rank 1 (the math winner) but can pick rank 2 or 3 if it spots a real problem the math missed (like a dealbreaker hidden in the text). small score gap + vibe reason = ok to override. big score gap = trust math.

so its math + AI safety net. fast (3 sec vs 50 sec before) and consistent.
