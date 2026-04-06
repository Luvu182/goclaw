import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Contact, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "@/stores/use-toast-store";
import { useMinLoading } from "@/hooks/use-min-loading";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { useContacts } from "./hooks/use-contacts";
import { useContactMerge } from "./hooks/use-contact-merge";
import { ContactFilters, SelectionToolbar } from "./contact-filters";
import { ContactTable } from "./contact-table";
import { GroupsPanel } from "./groups-panel";
import { PermissionsNote } from "./permissions-note";
import { MergeContactsDialog } from "./merge-contacts-dialog";

export function ContactsPage() {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation("common");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [channelType, setChannelType] = useState("");
  const [contactType, setContactType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const { contacts, total, loading, fetching, refresh } = useContacts({
    search: appliedSearch || undefined,
    channelType: channelType || undefined,
    contactType: contactType || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const { unmerge } = useContactMerge();

  const spinning = useMinLoading(fetching);
  const showSkeleton = useDeferredLoading(loading && contacts.length === 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = !!(appliedSearch || channelType || contactType);

  // Clear selection on page/filter change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, appliedSearch, channelType, contactType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
    setPage(1);
  };

  const handleChannelChange = (val: string) => {
    setChannelType(val === "all" ? "" : val);
    setPage(1);
  };

  const handleContactTypeChange = (val: string) => {
    setContactType(val === "all" ? "" : val);
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
  const allSelectedMerged = selectedContacts.length > 0 && selectedContacts.every((c) => c.merged_id);

  const handleUnmerge = async () => {
    try {
      await unmerge(selectedContacts.map((c) => c.id));
      toast.success(t("merge.dialogTitle"), t("merge.unmergeSuccess"));
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(t("merge.dialogTitle"), err instanceof Error ? err.message : t("merge.unmergeError"));
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-10">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={spinning} className="gap-1">
            <RefreshCw className={"h-3.5 w-3.5" + (spinning ? " animate-spin" : "")} /> {tc("refresh")}
          </Button>
        }
      />

      <Tabs defaultValue="users" className="mt-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1">
            <Contact className="h-3.5 w-3.5" /> {t("tabs.users")}
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1">
            <Users className="h-3.5 w-3.5" /> {t("tabs.groups")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0 space-y-3">
          <PermissionsNote />

          <ContactFilters
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            channelType={channelType}
            onChannelChange={handleChannelChange}
            contactType={contactType}
            onContactTypeChange={handleContactTypeChange}
          />

          <SelectionToolbar
            selectedCount={selectedIds.size}
            allSelectedMerged={allSelectedMerged}
            onMerge={() => setMergeDialogOpen(true)}
            onUnmerge={handleUnmerge}
          />

          <ContactTable
            contacts={contacts}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            showSkeleton={showSkeleton}
            hasFilters={hasFilters}
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          <GroupsPanel />
        </TabsContent>
      </Tabs>

      <MergeContactsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selectedContacts={selectedContacts}
        onSuccess={() => {
          setSelectedIds(new Set());
          refresh();
        }}
      />
    </div>
  );
}
