---
name: Role access model
description: The product decision governing role sources, action permissions, scopes, and reporting hierarchy.
---

Users can receive access from both direct roles and active employee-group roles. Roles grant individual actions within modules, and each granted action has an Own, Team, or All data scope. Team includes active direct and indirect reports. All may be narrowed by department, service, or account-manager exceptions, optionally retaining reporting-hierarchy behavior. Effective access combines every active source without one assignment replacing another. Specialized roles are based on one standard role and must preserve its enabled actions and minimum scopes while allowing additional actions or broader scopes.

**Why:** Admins need to explain not only whether a user can enter a module, but which action is allowed, which records it covers, and whether access came directly, through a group, or from a specialized role's base. Reporting relationships are part of scope evaluation, so circular hierarchies must be prevented.

**How to apply:** New Admin flows must preserve direct and inherited role sources, ignore inactive roles/groups for new effective access, expose action and scope details, and explain exceptions and reporting-derived reach. Persist specialized roles with their base-role identity and merge the base minimum during creation and hydration, not only in display code. Reporting-manager changes must reject inactive managers and direct or indirect cycles.