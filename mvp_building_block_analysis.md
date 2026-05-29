# MVP Building Block Analysis

## Short answer

Yes, we can create an MVP app that solves their shared scheduling problem without inventing everything from scratch.

The best path is probably not to fork or deeply customize Cal.com. Cal.com is built around booking meetings and appointments. Telcyte and Barker need internal operational scheduling: crews, technicians, equipment, jobs, availability, conflicts, and reporting. Those are close enough to scheduling to make Cal.com tempting, but different enough that we would likely spend too much time removing or working around features they do not need.

The better approach is to use proven building blocks for the hard generic parts, then build a small custom app around their specific business rules.

## What Cal.com gives us

Cal.com is useful as a reference point because it already thinks through availability, bookings, calendar integrations, APIs, and webhooks. Its current open-source/community path is Cal.diy, which Cal.com describes as including the core scheduling engine, app store framework, booking flows, and API v2.

Useful ideas or pieces:

- Availability logic
- Booking creation
- Calendar integration patterns
- Webhooks/API patterns
- User-facing scheduling flows
- Self-hosting patterns

Less useful for this use case:

- Public booking pages
- Meeting/event type setup
- Video call integrations
- External attendee booking flows
- Payment-related flows
- A lot of account, app store, and general scheduling platform complexity

Important caveat: Cal.com's own April 2026 update says the open-source Cal.diy version removed several managed-service and enterprise features, including organization/team availability flows, workflows, routing forms, insights, and some team-related APIs. That matters because the Telcyte/Barker use case depends heavily on team/resource scheduling, workflow automation, and operational reporting.

## Why their needs are different from normal appointment scheduling

Normal appointment scheduling asks:

- Who is available?
- What time can the customer book?
- What calendar should the booking land on?

Their scheduling problem asks:

- Which technician, crew, or equipment is available?
- What kind of work is required?
- Does this job need a specific tool, vehicle, permit, traffic plan, or subcontractor?
- Is the job internal, subcontracted, or split?
- Can we see capacity across a month?
- Can we replace an Excel sheet or whiteboard without adding admin burden?
- Can this connect to Smartsheet, ServiceTitan, or exported spreadsheet data?

That is more like a lightweight dispatch and capacity planning tool than a booking app.

## Recommended MVP direction

Build a thin custom scheduling app using off-the-shelf components where they help.

Use existing building blocks for:

- Calendar/resource timeline UI
- Date handling
- Drag-and-drop scheduling
- Authentication, if needed
- Database/storage
- Import/export
- Webhooks or automation triggers

Build custom logic for:

- People, crews, and equipment as schedulable resources
- Job/project assignments
- Telcyte-specific work types and equipment requirements
- Barker technician scheduling by month
- Conflict detection
- Smartsheet or spreadsheet sync
- Simple field-friendly views
- Manager snapshots and reports

## MVP app shape

1. Resources
   - People
   - Crews
   - Equipment
   - Subcontractors

2. Jobs or shifts
   - Job name or project ID
   - Customer/project reference
   - Start and end date
   - Required resource type
   - Status
   - Work type
   - Notes

3. Assignments
   - Assign one or more people, crews, or equipment items to a job
   - Show assignments on a calendar
   - Allow drag-and-drop rescheduling

4. Conflict checks
   - Person already booked
   - Equipment already booked
   - Required equipment missing
   - Job has no assigned resource
   - Schedule exceeds available capacity

5. Views
   - Month view for Barker technician scheduling
   - Week/day resource view for Telcyte construction planning
   - Equipment view for Telcyte
   - Open conflicts view
   - Printable/shareable snapshot

6. Integrations
   - Barker: start with Excel import/export, then ServiceTitan-related links later
   - Telcyte: start with Smartsheet import/export or API sync
   - Keep manual override available in the MVP

## Better building-block options

### Option A: Cal.com or Cal.diy as the base

Use this only if the main problem becomes external appointment booking.

Pros:

- Mature scheduling product
- Strong booking/availability foundation
- API and webhook concepts already exist

Cons:

- Too much product surface for this use case
- Not centered on equipment, crews, dispatch, or capacity planning
- Would likely require heavy customization
- Current open-source/community version no longer includes some team/workflow/reporting features that sound relevant

Verdict: useful for inspiration, not the best core foundation.

### Option B: Calendar UI library plus custom backend

Use a strong calendar/resource scheduling component, then build the app around their real workflow.

Pros:

- Much lighter
- Easier to tailor to Telcyte and Barker
- Avoids inheriting a large product we do not need
- Keeps the first version focused

Cons:

- We build the business rules ourselves
- Integrations still need custom work

Verdict: best MVP path.

### Option C: No-code/low-code prototype first

Use Airtable, Smartsheet, or a similar tool to prototype the workflow quickly.

Pros:

- Fastest way to validate the process
- Good for early feedback
- Useful if the goal is to prove the scheduling model before building

Cons:

- May hit limits with field adoption, equipment logic, and clean integrations
- Can become another manual system if not carefully designed

Verdict: good discovery/prototype path, but probably not the final product if both clients need tailored scheduling.

## Recommended first version

The MVP should be a small scheduling and capacity app, not a full scheduling platform.

It should do five things well:

1. Show a shared calendar.
2. Track people and equipment availability.
3. Assign jobs or shifts to resources.
4. Flag conflicts automatically.
5. Import/export or sync with the current source of truth.

That would directly address Telcyte's whiteboard/equipment-capacity issue and Barker's Excel scheduling issue without dragging in unnecessary booking-platform complexity.

## What I would avoid in the MVP

- Public booking pages
- Customer self-scheduling
- Payments
- Video meeting links
- Complex team permission systems
- Advanced workflow automation
- AI scheduling suggestions before the basic rules are trusted
- Deep two-way sync before the core model is validated

## Practical build sequence

1. Define the shared data model: resources, jobs, assignments, availability, conflicts.
2. Build the calendar/resource view.
3. Add manual create/edit/drag/drop scheduling.
4. Add conflict detection.
5. Add Excel import/export for Barker.
6. Add Smartsheet sync or export for Telcyte.
7. Add role-specific views for managers, office users, and field users.
8. Add notifications only after the conflict rules are solid.

## Decision

Use Cal.com as inspiration, not as the main codebase.

For this need, a tailored MVP built on a calendar/resource scheduling component is cleaner, faster, and more aligned with what Nick and Cat actually asked for.
