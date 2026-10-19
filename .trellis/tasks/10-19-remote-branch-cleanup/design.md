# Safe branch cleanup

Keep two long-lived branches. Preserve exact historical tips with archive/ names that cannot be confused with release version tags. Push all archive tags atomically and read them back before deleting old heads; refuse unexpected tip changes. Existing history stays reachable.

Close PR#3 as obsolete without merging/commenting. Push current develop only after auditing pending object content and excluding ignored runtime/browser data. Source product must remain identical to master. Update project branch policy with active roles and archival procedure.

Rollback is possible by pushing an archive tag's object back to its original branch name; record exact names/hashes. Do not remove tags. Master does not receive any commit in this task.
