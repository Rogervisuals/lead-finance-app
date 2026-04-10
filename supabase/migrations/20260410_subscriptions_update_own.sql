-- Allow users to update their own subscription row (e.g. temporary post-checkout upgrade; webhooks will replace this later).
drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
