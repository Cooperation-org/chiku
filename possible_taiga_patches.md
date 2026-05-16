# Possible Taiga Patches

## 1. Membership Validator: bypass contact check for superusers/project admins

**File:** `taiga/projects/validators.py` — `MembershipValidator.validate_username`

**Problem:** When adding a member by username, the validator checks if the username is a "valid contact" via `request.user.contacts_visible_by_user()`. This filters to users who share project membership with the actor. Users with 0 memberships (e.g. new users, volunteers who haven't been added to any project yet) fail this check, even for superusers.

**Error:** `400: The user must be a valid contact`

**Root cause:** `contacts_visible_by_user` returns only users who have memberships in projects visible to the actor. Users with zero memberships are never visible as contacts.

**Fix idea:** In `validate_username`, if `request.user.is_superuser` or `request.user` is a project admin of the target project, skip the contact check:

```python
def validate_username(self, attrs, source):
    username = attrs.get(source, None)
    try:
        validate_user_email_allowed_domains(username)
    except InvalidEmailValidationError:
        request = self.context.get("request", None)
        if request is not None and request.user.is_authenticated:
            # Superusers and project admins can add any user
            if not (request.user.is_superuser or self._is_project_admin(request)):
                valid_usernames = request.user.contacts_visible_by_user(request.user).values_list("username", flat=True)
                if username not in valid_usernames:
                    raise ValidationError(_("The user must be a valid contact"))
    ...
```

Similarly for `_MemberBulkValidator.validate_username`.

## 2. Same issue in bulk_create path (`_MemberBulkValidator`)

Same pattern — the bulk validator also calls `contacts_visible_by_user` for email-based invites when the email domain validation fails. Superuser bypass needed there too.

## 3. DB workaround (current fix)

Add the user to at least one project as a stakeholder before they can be added to others. This is only a temporary fix — it works but requires manual DB intervention for each new user.