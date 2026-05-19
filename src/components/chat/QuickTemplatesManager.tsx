import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Loader2, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useQuickTemplates, type QuickTemplate } from "@/hooks/useQuickTemplates";

interface Props {
  storeId: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function QuickTemplatesManager({ storeId, canEdit, open, onOpenChange }: Props) {
  const { templates, loading, seedDefaults, addTemplate, updateTemplate, deleteTemplate } =
    useQuickTemplates(storeId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Semeia defaults quando abre pela primeira vez e não tem templates
  useEffect(() => {
    if (open && !loading && templates.length === 0) {
      seedDefaults();
    }
  }, [open, loading]);

  function startEdit(t: QuickTemplate) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditBody(t.body);
    setIsAdding(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    const err = await updateTemplate(editingId, { title: editTitle.trim(), body: editBody.trim() });
    setSaving(false);
    if (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      cancelEdit();
    }
  }

  async function handleAdd() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    const err = await addTemplate(newTitle, newBody);
    setSaving(false);
    if (err) {
      toast({ title: "Erro ao criar template", variant: "destructive" });
    } else {
      setNewTitle("");
      setNewBody("");
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const err = await deleteTemplate(id);
    setDeletingId(null);
    if (err) toast({ title: "Erro ao deletar", variant: "destructive" });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Respostas Rápidas
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {/* Instrução de variáveis */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Use <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{nome}"}</code> para inserir o nome do contato automaticamente.</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border bg-card p-3 space-y-1.5"
              >
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Título do template"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      placeholder="Texto da mensagem..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={saving || !editTitle.trim() || !editBody.trim()}
                        className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="h-7 gap-1"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">{t.title}</p>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => startEdit(t)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                          >
                            {deletingId === t.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{t.body}</p>
                  </>
                )}
              </div>
            ))
          )}

          {/* Adicionar novo */}
          {canEdit && (
            <div className="pt-1">
              {isAdding ? (
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-card p-3 space-y-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título (ex: Promoção relâmpago)"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Texto da mensagem... Use {nome} para o nome do contato."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={saving || !newTitle.trim() || !newBody.trim()}
                      className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Criar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setIsAdding(false); setNewTitle(""); setNewBody(""); }}
                      className="h-7 gap-1"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-9 gap-2 border-dashed"
                  onClick={() => { setIsAdding(true); cancelEdit(); }}
                >
                  <Plus className="h-4 w-4" />
                  Novo template
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
