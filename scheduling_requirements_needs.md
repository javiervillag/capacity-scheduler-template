# Scheduling Requirements and Needs

## Sources reviewed

- [Telcyte & AI Daddy - Weekly Sync, May 19, 2026](https://fathom.video/calls/677445685): Nick raised the need for a construction calendar/capacity tool connected to Smartsheet and the current project workflow.
- [Barker & AI Daddy - Weekly Sync, May 4, 2026](https://fathom.video/calls/658702315): Cat raised the need for scheduling software because Barker is managing about 40 technicians per month in Excel.
- [30 min Consult between Lucas Petty and Justin Mock, April 6, 2026](https://fathom.video/calls/625489053): Related Telcyte planning context around reducing manual entries and improving project workflow.

## Shared pattern

Both teams have outgrown a manual scheduling process. Telcyte is using a physical/visual board and group chat pictures to coordinate construction crews and equipment. Barker is using an Excel sheet to schedule a large technician team every month. In both cases, scheduling is not just a calendar problem; it is also a capacity, availability, and operational visibility problem.

## Similar requirements and needs

1. A shared scheduling calendar
   - Teams need one place to see what is scheduled, who is assigned, and when work is expected to happen.
   - Telcyte framed this as a construction calendar that could work with Smartsheet.
   - Barker framed this as scheduling software to replace the monthly Excel process.

2. People capacity tracking
   - The system should show who is available, who is already assigned, and where there may be conflicts.
   - Telcyte needs this for construction crews and office planning.
   - Barker needs this for about 40 technicians scheduled each month.

3. Equipment availability tracking
   - Telcyte specifically needs to know whether the right equipment is available for a job, not just whether people are available.
   - A job may be blocked even if crews are free, because the required equipment is already allocated elsewhere.

4. Dynamic resource allocation
   - Scheduling should update when job dates, crew availability, equipment availability, or project needs change.
   - The goal is to avoid static planning that only lives on a whiteboard, spreadsheet, or one person's memory.

5. Integration with existing systems
   - Telcyte needs the calendar to connect with Smartsheet and the construction/project tracker.
   - Barker's scheduling need sits alongside ServiceTitan reporting and technician performance workflows.
   - The scheduling tool should reduce duplicate entry instead of creating another place to maintain manually.

6. Spreadsheet replacement or spreadsheet bridge
   - Barker needs to move beyond Excel because the monthly scheduling process is becoming too much to manage.
   - The first version may still need import/export support so the team can transition without losing their current working format.

7. Visual planning view
   - Telcyte needs a clear visual replacement for the current board.
   - Barker likely needs a month-level technician view that is easier to scan than a large spreadsheet.
   - Useful views could include day, week, month, crew, technician, equipment, and job/project.

8. Conflict detection
   - The system should flag double-booked people, double-booked equipment, missing assignments, and jobs that cannot be staffed.
   - For Telcyte, this should include equipment conflicts.
   - For Barker, this should include technician schedule overload or gaps.

9. Simple field adoption
   - Telcyte raised a concern that construction crews may resist logging into a new app or struggle with extra admin work.
   - The tool should be very easy for field users: minimal clicks, mobile-friendly, and clear enough to use without heavy training.

10. Role-based usage
    - Office/admin users may need full editing and planning control.
    - Field users may only need to view assignments, confirm availability, or report simple updates.
    - Managers may need capacity and schedule summaries rather than detailed editing screens.

11. Job type and work requirement tagging
    - Telcyte needs scheduling to account for what kind of work is required, such as TCP/TRAX, work notifications, white line/BlueStake, boring, subcontractor work, in-house work, and equipment-dependent work.
    - These tags can drive capacity needs and help determine who or what should be assigned.

12. Internal crew and subcontractor handling
    - Telcyte work may be done by in-house crews, subcontractors, or a combination.
    - The scheduling system should distinguish internal capacity from subcontractor assignments.

13. Search and filtering
    - Users should be able to filter by date, technician, crew, equipment, job, customer/project, status, work type, and owner.
    - This matters because both teams are managing enough volume that a single flat calendar will become hard to use quickly.

14. Reporting and snapshots
    - Barker's broader workflow shows a need for printable or shareable operational snapshots.
    - Scheduling should support manager-friendly views such as today's schedule, this week's capacity, monthly technician assignments, and open scheduling gaps.

15. Notifications for only meaningful changes
    - Telcyte wants fewer noisy notifications in other workflows and only wants alerts when something meaningful happened.
    - Scheduling alerts should follow the same idea: notify on conflicts, missing assignments, upcoming capacity issues, or schedule changes that require action.

16. Build-vs-buy evaluation
    - Telcyte explicitly asked whether an existing calendar app could integrate with Smartsheet or whether a custom app would be better.
    - The right answer depends on whether an off-the-shelf tool can handle the required integrations, equipment capacity, field simplicity, and job-specific rules without excessive workaround effort.

17. Low-admin workflow
    - Both teams need the scheduling process to reduce admin work, not shift the burden to a different tool.
    - The ideal system should pull from existing project/job data where possible and ask humans only for decisions that truly require human judgment.

## Possible MVP

1. Create one shared scheduling board/calendar.
2. Track people and equipment as resources.
3. Connect scheduled work back to the existing project/job tracker.
4. Add conflict detection for double-booked people or equipment.
5. Provide simple views for office users and field users.
6. Allow import/export from the current spreadsheet or board process during transition.
7. Keep notifications focused on conflicts, missing assignments, and important changes.

## Questions to answer before choosing a tool or building one

1. Who owns the schedule day to day?
2. Who needs edit access versus view-only access?
3. What resources must be tracked: technicians, crews, equipment, subcontractors, vehicles, permits, or all of the above?
4. What existing system should be the source of truth?
5. Does the schedule need to write back into Smartsheet, ServiceTitan, or another tracker?
6. How often does the schedule change after it is created?
7. What conflicts should block scheduling versus only warn the user?
8. What reports or snapshots are needed daily, weekly, and monthly?
9. What is the simplest experience that field users would actually adopt?
10. Is the priority to recommend an existing tool, build a lightweight custom app, or prototype both paths?

## Evidence notes

- Telcyte currently lacks clear capacity tracking for people and equipment; Nick said their process relies on the board picture and team knowledge, and that equipment availability can block a job even when people are available. Relevant moments: [42:06](https://fathom.video/calls/677445685?timestamp=2526), [42:55](https://fathom.video/calls/677445685?timestamp=2575), [43:08](https://fathom.video/calls/677445685?timestamp=2588).
- Telcyte also raised adoption concerns for construction users, noting that any new tool needs to be easy for the construction team to use and troubleshoot. Relevant moment: [44:24](https://fathom.video/calls/677445685?timestamp=2664).
- Barker's scheduling pain is spreadsheet scale: Cat said they are scheduling around 40 technicians per month and that Excel is becoming too much to manage. Relevant moment: [37:10](https://fathom.video/calls/658702315?timestamp=2230).
- Barker's broader workflow also shows the value of automated snapshots and avoiding scattered manual reporting. Relevant moments: [41:19](https://fathom.video/calls/658702315?timestamp=2479), [45:12](https://fathom.video/calls/658702315?timestamp=2712), [47:00](https://fathom.video/calls/658702315?timestamp=2820).
