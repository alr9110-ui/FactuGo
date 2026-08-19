import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Bot, CheckCircle2, FileText, Info, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { EXPENSE_CATEGORIES, autoCategorizeExpense } from '@/lib/expenseCategories';
import { getFiscalYearFromDate, getQuarterFromDate, getReceivedInvoiceAccountingDate, isReceivedInvoiceFromClosedQuarter } from '@/lib/fiscalUtils';
import { upsertCounterpartyFromInvoice } from '@/lib/counterparties';
import { cn } from '@/lib/utils';

export default function Digitize() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [editData, setEditData] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setExtractedData(null);
    setEditData(null);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setUploading(false);
      setProcessing(true);
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `Analiza esta factura española y extrae los siguientes datos en formato JSON. Si no encuentras algún dato, pon null. Campos: invoice_number, client_name, client_nif, client_address, date (formato YYYY-MM-DD), concept, base_imponible (número), iva_rate (porcentaje como número), iva_amount (número), irpf_rate (número o null), irpf_amount (número o null), total (número), payment_method (transferencia/efectivo/tarjeta/domiciliacion/otro), items (array de objetos con description, quantity, unit_price, subtotal, iva_amount, total). Valida que los cálculos sean correctos según la normativa fiscal española.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            invoice_number: { type: 'string' }, client_name: { type: 'string' }, client_nif: { type: 'string' },
            client_address: { type: 'string' }, date: { type: 'string' }, concept: { type: 'string' },
            base_imponible: { type: 'number' }, iva_rate: { type: 'number' }, iva_amount: { type: 'number' },
            irpf_rate: { type: 'number' }, irpf_amount: { type: 'number' }, total: { type: 'number' },
            payment_method: { type: 'string' },
            expense_category: { type: 'string', enum: ['suministros', 'oficina', 'desplazamientos', 'alimentacion', 'servicios_profesionales', 'alquiler', 'publicidad_marketing', 'seguros', 'equipamiento', 'otros'] },
            items: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, quantity: { type: 'number' }, unit_price: { type: 'number' }, subtotal: { type: 'number' }, iva_amount: { type: 'number' }, total: { type: 'number' } } } },
            confidence: { type: 'number' },
          },
        },
      });
      setExtractedData(result);
      setEditData({
        ...result,
        type: 'recibida', status: 'borrador',
        accounting_date: getReceivedInvoiceAccountingDate(result.date),
        category: result.expense_category || autoCategorizeExpense(result.concept, result.client_name),
        file_url, ocr_processed: true, ocr_confidence: result.confidence || 85,
      });
    } catch (error) {
      toast({ title: 'No se pudo procesar la factura', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async data => {
      const accountingDate = data.type === 'recibida' ? getReceivedInvoiceAccountingDate(data.date) : data.date;
      const fiscalDate = data.type === 'recibida' ? accountingDate : data.date;
      const invoice = await appClient.entities.Invoice.create({
      ...data,
      accounting_date: data.type === 'recibida' ? accountingDate : undefined,
      quarter: getQuarterFromDate(fiscalDate),
      fiscal_year: getFiscalYearFromDate(fiscalDate),
      category: data.type === 'recibida' ? (data.category || 'otros') : undefined,
      base_imponible: Number(data.base_imponible) || 0, iva_amount: Number(data.iva_amount) || 0,
      iva_rate: Number(data.iva_rate) || 21, irpf_rate: Number(data.irpf_rate) || 0,
      irpf_amount: Number(data.irpf_amount) || 0, total: Number(data.total) || 0,
      });
      await upsertCounterpartyFromInvoice(invoice, appClient.entities.Client);
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Factura guardada correctamente' });
      navigate('/facturas');
    },
  });

  const updateField = (field, value) => setEditData(previous => {
    const next = { ...previous, [field]: value };
    if (next.type === 'recibida' && (field === 'date' || field === 'type')) next.accounting_date = getReceivedInvoiceAccountingDate(next.date);
    if (field === 'type' && value === 'emitida') next.accounting_date = '';
    return next;
  });
  const reset = () => { setExtractedData(null); setEditData(null); setFile(null); setPreview(null); };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">Digitalizar factura</h1>
        <p className="text-sm text-muted-foreground mt-1">Sube una foto o PDF y extraeremos los datos automáticamente con IA</p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <Bot className="w-4 h-4 mt-0.5 shrink-0" />
        <div><span className="font-semibold">Sistema de procesamiento con Inteligencia Artificial</span><span className="text-blue-700 dark:text-blue-400"> — </span>Esta función utiliza IA para extraer automáticamente los datos de tu factura. Los resultados son una propuesta automatizada y <strong>deben ser revisados y verificados por ti</strong> antes de guardarlos.</div>
      </div>

      {!extractedData && <Card><CardContent className="p-8">
        <div onClick={() => fileRef.current?.click()} className={cn('border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all', file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50')}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
          {preview ? <img src={preview} alt="Vista previa" className="max-h-64 mx-auto rounded-lg shadow-lg" /> : file ? <div className="space-y-2"><FileText className="w-12 h-12 mx-auto text-primary" /><p className="font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div> : <div className="space-y-3"><div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center"><Upload className="w-7 h-7 text-muted-foreground" /></div><div><p className="font-medium text-foreground">Arrastra o selecciona un archivo</p><p className="text-xs text-muted-foreground mt-1">JPG, PNG o PDF — máx. 10 MB</p></div></div>}
        </div>
        {file && !processing && <div className="mt-6 flex justify-center"><Button onClick={handleProcess} disabled={uploading} className="gap-2">{uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Sparkles className="w-4 h-4" /> Procesar con IA</>}</Button></div>}
        {processing && <div className="mt-6 text-center space-y-3"><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /><p className="text-sm font-medium">Analizando factura con IA...</p><p className="text-xs text-muted-foreground">Extrayendo NIF, importes y líneas de detalle...</p></div>}
      </CardContent></Card>}

      {editData && <Card><CardHeader className="pb-4"><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><CardTitle className="text-lg">Datos extraídos — Revisa y confirma</CardTitle></div>{editData.ocr_confidence && <p className="text-xs text-muted-foreground">Confianza del OCR: {editData.ocr_confidence}%</p>}<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 mt-2"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span><strong>Contenido generado por IA:</strong> verifica cada campo antes de guardar. El sistema puede cometer errores.</span></div></CardHeader>
        <CardContent className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo de factura"><Select value={editData.type} onValueChange={v => updateField('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recibida">Recibida (gasto)</SelectItem><SelectItem value="emitida">Emitida (ingreso)</SelectItem></SelectContent></Select></Field>
          <TextField label="Nº Factura" field="invoice_number" data={editData} onChange={updateField} />
          <TextField label="Cliente / Proveedor" field="client_name" data={editData} onChange={updateField} />
          <TextField label="NIF/CIF" field="client_nif" data={editData} onChange={updateField} />
          <TextField label="Fecha de la factura" field="date" type="date" data={editData} onChange={updateField} />
          {editData.type === 'recibida' && <div className="space-y-2"><Label>Fecha de contabilización</Label><Input type="date" value={editData.accounting_date || ''} disabled /><p className="text-xs text-muted-foreground">La fecha original se conserva en la factura.</p></div>}
          {editData.type === 'recibida' && isReceivedInvoiceFromClosedQuarter(editData.date) && <div className="md:col-span-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertCircle className="w-4 h-4 shrink-0" /><span>Esta factura pertenece a un trimestre cerrado. Se registrará en el trimestre abierto actual con fecha de contabilización {editData.accounting_date}.</span></div>}
          <TextField label="Concepto" field="concept" data={editData} onChange={updateField} />
          <TextField label="Base imponible" field="base_imponible" type="number" data={editData} onChange={updateField} />
          <TextField label="Tipo IVA (%)" field="iva_rate" type="number" data={editData} onChange={updateField} />
          <TextField label="Cuota IVA" field="iva_amount" type="number" data={editData} onChange={updateField} />
          <TextField label="Total" field="total" type="number" data={editData} onChange={updateField} />
          <TextField label="Retención IRPF (%)" field="irpf_rate" type="number" data={editData} onChange={updateField} />
          <Field label="Forma de pago"><Select value={editData.payment_method || 'transferencia'} onValueChange={v => updateField('payment_method', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['transferencia', 'efectivo', 'tarjeta', 'domiciliacion', 'otro'].map(value => <SelectItem key={value} value={value}>{value === 'domiciliacion' ? 'Domiciliación' : value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field>
          {editData.type === 'recibida' && <div className="space-y-2 md:col-span-2"><Label className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" />Categoría del gasto</Label><Select value={editData.category || 'otros'} onValueChange={v => updateField('category', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(category => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Categoría sugerida automáticamente por la IA. Puedes modificarla si no es correcta.</p></div>}
        </div><div className="flex gap-3 pt-4 border-t border-border"><Button onClick={() => saveMutation.mutate(editData)} disabled={saveMutation.isPending} className="gap-2">{saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Guardar factura</Button><Button variant="outline" onClick={reset}>Cancelar</Button></div></CardContent>
      </Card>}
    </div>
  );
}

function Field({ label, children }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function TextField({ label, field, type = 'text', data, onChange }) { return <Field label={label}><Input type={type} step={type === 'number' ? '0.01' : undefined} value={data[field] || ''} onChange={e => onChange(field, e.target.value)} /></Field>; }
