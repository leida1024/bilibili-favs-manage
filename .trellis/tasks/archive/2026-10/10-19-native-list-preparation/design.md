# Native page preparation and identity

Keep page lifecycle/account boundaries unchanged. WebFolderClient waits for the current matching page's native group, expands it, then enumerates every visible native row via existing more controls or legacy scrollbar events. Legacy total comes from the scrollbar parent view model's read-only collectedList.count/list. No cross-account destructive queue is restored or auto-run.

A nativeBindings adapter scans the VUI root VNode tree with a visited set and node budget, associating FavSidebarItem component.el with the requested DOM rows and reading only props. Legacy uses the row's actual router-link fid/ctype and disabled class; parent source data can supply exact metadata. Binding validity requires supported composite identity, native scope and matching displayed name. No list position is identity; live order comparison is evidence, not an execution assumption.

WebFolderClient.inspect/select uses direct subscriptions bindings when available, avoiding disabled content links. A fresh binding is checked before menu submission and final dialog confirmation. Available rows without bound data keep existing route-based discovery. Missing unavailable binding fails explicitly before submission and suggests API as an explicit user choice.

VUI unsubscribe requires the same visible native dialog handling discipline as deletion; legacy remains immediate. A menu click can submit on legacy, so mark the result uncertain before dispatch and never retry. Final result requires exact row disappearance and expected native count change, including legacy last-row group removal with confirmed zero source count.

The management preview issues the usual one-use ticket even for unavailable objects. It explains that native lists are automatically prepared and exact identities checked. It must not silently switch transports or claim completion from a click.
