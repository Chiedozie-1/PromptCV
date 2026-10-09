create table if not exists public.waitlist_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    email_normalized text not null unique,
    consent_status boolean not null default true,
    consented_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    status text not null default 'active'
        check (status in ('active', 'unsubscribed', 'suppressed')),
    launch_notified_at timestamptz,
    last_launch_campaign_id uuid
);

create table if not exists public.waitlist_notification_outbox (
    id uuid primary key default gen_random_uuid(),
    subscriber_id uuid not null references public.waitlist_subscribers(id) on delete cascade,
    notification_type text not null default 'signup_admin_alert'
        check (notification_type = 'signup_admin_alert'),
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'failed')),
    attempt_count integer not null default 0 check (attempt_count >= 0),
    provider_message_id text,
    last_error text,
    created_at timestamptz not null default now(),
    sent_at timestamptz
);

create index if not exists waitlist_subscribers_created_at_idx
    on public.waitlist_subscribers (created_at desc);
create index if not exists waitlist_notification_outbox_status_idx
    on public.waitlist_notification_outbox (status, created_at);

create table if not exists public.waitlist_signup_rate_limits (
    ip_hash text primary key
        check (ip_hash ~ '^[a-f0-9]{64}$'),
    window_started_at timestamptz not null default now(),
    request_count integer not null default 0 check (request_count >= 0)
);
create index if not exists waitlist_signup_rate_limits_window_idx
    on public.waitlist_signup_rate_limits (window_started_at);

alter table public.waitlist_subscribers enable row level security;
alter table public.waitlist_notification_outbox enable row level security;
alter table public.waitlist_signup_rate_limits enable row level security;

revoke all on table public.waitlist_subscribers from public, anon, authenticated;
revoke all on table public.waitlist_notification_outbox from public, anon, authenticated;
revoke all on table public.waitlist_signup_rate_limits from public, anon, authenticated;
grant all on table public.waitlist_subscribers to service_role;
grant all on table public.waitlist_notification_outbox to service_role;
grant all on table public.waitlist_signup_rate_limits to service_role;

drop function if exists public.join_waitlist(text, text);

create function public.join_waitlist(p_email text, p_ip_hash text)
returns table (
    subscriber_id uuid,
    notification_id uuid,
    inserted boolean,
    rate_limited boolean,
    signup_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    normalized_email text := lower(btrim(p_email));
    current_subscriber_id uuid;
    current_notification_id uuid;
    current_signup_created_at timestamptz;
    current_status text;
    was_inserted boolean := false;
    current_request_count integer;
begin
    delete from public.waitlist_signup_rate_limits
    where window_started_at <= now() - interval '24 hours';

    if normalized_email is null
        or length(normalized_email) > 254
        or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        or p_ip_hash is null
        or p_ip_hash !~ '^[a-f0-9]{64}$' then
        raise exception using errcode = '22023', message = 'Invalid signup data';
    end if;

    insert into public.waitlist_signup_rate_limits as existing_limit (ip_hash, window_started_at, request_count)
    values (p_ip_hash, now(), 1)
    on conflict (ip_hash) do update
    set window_started_at = case
            when existing_limit.window_started_at <= now() - interval '1 hour'
                then now()
            else existing_limit.window_started_at
        end,
        request_count = case
            when existing_limit.window_started_at <= now() - interval '1 hour'
                then 1
            else existing_limit.request_count + 1
        end
    returning request_count into current_request_count;

    if current_request_count > 5 then
        return query select null::uuid, null::uuid, false, true, null::timestamptz;
        return;
    end if;

    insert into public.waitlist_subscribers (email, email_normalized, consent_status, consented_at)
    values (btrim(p_email), normalized_email, true, now())
    on conflict (email_normalized) do nothing
    returning id, created_at into current_subscriber_id, current_signup_created_at;

    was_inserted := current_subscriber_id is not null;
    if was_inserted then
        insert into public.waitlist_notification_outbox (subscriber_id)
        values (current_subscriber_id)
        returning id into current_notification_id;
    else
        select subscriber.id, subscriber.status
        into current_subscriber_id, current_status
        from public.waitlist_subscribers as subscriber
        where subscriber.email_normalized = normalized_email
        for update;

        if current_status = 'unsubscribed' then
            update public.waitlist_subscribers as subscriber
            set consent_status = true,
                consented_at = now(),
                updated_at = now(),
                status = 'active'
            where subscriber.id = current_subscriber_id;
            current_signup_created_at := now();
            was_inserted := true;
        end if;

        if was_inserted then
            insert into public.waitlist_notification_outbox (subscriber_id)
            values (current_subscriber_id)
            returning id into current_notification_id;
        end if;
    end if;

    return query select current_subscriber_id, current_notification_id, was_inserted, false, current_signup_created_at;
end;
$$;

revoke all on function public.join_waitlist(text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist(text, text) to service_role;
