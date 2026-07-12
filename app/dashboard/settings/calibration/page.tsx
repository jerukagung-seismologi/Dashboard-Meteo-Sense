"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices, Device } from "@/lib/FetchingDevice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Settings2, Save, Undo2, AlertCircle } from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StationCalibrationDocument, StationCalibrationDocumentSchema, DEFAULT_VARIABLE_CALIBRATION, CalibrationMethod } from "@/lib/calibration/calibrationTypes";
import { getCalibrationDocument, saveCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import { CalibrationPreviewChart } from "@/components/calibration/CalibrationPreviewChart";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VARIABLES = [
  { key: "temperature", label: "Air Temperature", unit: "°C" },
  { key: "humidity", label: "Relative Humidity", unit: "%" },
  { key: "pressure", label: "Atmospheric Pressure", unit: "hPa" },
  { key: "dew", label: "Dew Point", unit: "°C" },
  { key: "rainfall", label: "Rainfall", unit: "mm" },
  { key: "rainrate", label: "Rain Rate", unit: "mm/hr" },
  { key: "windSpeed", label: "Wind Speed", unit: "m/s" },
  { key: "windDirection", label: "Wind Direction", unit: "°" },
  { key: "soil_temp", label: "Soil Temperature", unit: "°C" },
  { key: "lux", label: "Solar Radiation (Lux)", unit: "lx" },
  { key: "volt", label: "Battery Voltage", unit: "V" },
];

const METHODS = [
  { value: "none", label: "None (No Correction)" },
  { value: "percentage", label: "Percentage" },
  { value: "offset", label: "Offset (+/-)" },
  { value: "scale", label: "Scale (Multiplier)" },
  { value: "scale_offset", label: "Scale + Offset" },
  { value: "multiplier", label: "Multiplier (Rainfall)" },
];

export default function CalibrationManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<{label: string, value: string}[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewVar, setPreviewVar] = useState<string>("temperature");

  const form = useForm<StationCalibrationDocument>({
    resolver: zodResolver(StationCalibrationDocumentSchema),
    defaultValues: {
      stationId: "",
      enabled: true,
      temperature: { ...DEFAULT_VARIABLE_CALIBRATION },
      humidity: { ...DEFAULT_VARIABLE_CALIBRATION },
      pressure: { ...DEFAULT_VARIABLE_CALIBRATION },
      dew: { ...DEFAULT_VARIABLE_CALIBRATION },
      rainfall: { ...DEFAULT_VARIABLE_CALIBRATION },
      rainrate: { ...DEFAULT_VARIABLE_CALIBRATION },
      windSpeed: { ...DEFAULT_VARIABLE_CALIBRATION },
      windDirection: { ...DEFAULT_VARIABLE_CALIBRATION },
      soil_temp: { ...DEFAULT_VARIABLE_CALIBRATION },
      lux: { ...DEFAULT_VARIABLE_CALIBRATION },
      volt: { ...DEFAULT_VARIABLE_CALIBRATION },
    } as StationCalibrationDocument
  });

  // Load devices
  useEffect(() => {
    if (user?.uid) {
      const loadDevices = async () => {
        try {
          const res = await fetchAllDevices(user.uid);
          const options = res
            .filter((d) => d.authToken)
            .map((d) => ({
              label: d.name,
              value: d.authToken!,
            }));
          setDevices(options);
          if (options.length > 0) {
             setSelectedStation(options[0].value);
          }
        } catch (err) {
          console.error("Failed to load devices", err);
        }
      };
      loadDevices();
    }
  }, [user]);

  // Load config when station changes
  useEffect(() => {
    if (!selectedStation) return;
    
    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const data = await getCalibrationDocument(selectedStation);
        if (data) {
          form.reset({ ...data, stationId: selectedStation });
        } else {
          // Initialize empty config if not found
          const emptyConfig: any = { stationId: selectedStation, enabled: true };
          VARIABLES.forEach(v => { emptyConfig[v.key] = { ...DEFAULT_VARIABLE_CALIBRATION }; });
          form.reset(emptyConfig);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    
    loadConfig();
  }, [selectedStation, form, toast]);

  const onSubmit = async (data: StationCalibrationDocument) => {
    setIsSaving(true);
    try {
      await saveCalibrationDocument(selectedStation, data);
      toast({ title: "Sukses", description: "Konfigurasi kalibrasi berhasil disimpan." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const watchGlobalEnabled = form.watch("enabled");

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              Manajemen Kalibrasi Sensor
            </h2>
            <Settings2 className="h-5 w-5 text-indigo-500 hidden sm:inline" />
          </div>
          <p className="text-muted-foreground dark:text-slate-400 mt-1">
            Konfigurasi nilai koreksi otomatis untuk sensor stasiun cuaca. Data mentah di database tidak diubah.
          </p>
        </div>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-[300px]">
            <Label className="text-sm font-semibold text-slate-500">Pilih Stasiun Cuaca</Label>
            <Select value={selectedStation} onValueChange={setSelectedStation} disabled={devices.length === 0}>
              <SelectTrigger className="bg-white dark:bg-slate-900">
                <SelectValue placeholder="Memuat stasiun..." />
              </SelectTrigger>
              <SelectContent>
                {devices.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-md border border-slate-200 dark:border-slate-800">
            <Controller
              name="enabled"
              control={form.control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="global-enabled" />
              )}
            />
            <Label htmlFor="global-enabled" className="cursor-pointer font-medium">Aktifkan Engine Kalibrasi Global</Label>
          </div>
        </CardContent>
      </Card>

      {!watchGlobalEnabled && (
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Engine Kalibrasi Global saat ini <strong>Nonaktif</strong>. Semua data akan ditampilkan mentah tanpa koreksi terlepas dari konfigurasi variabel di bawah.
          </AlertDescription>
        </Alert>
      )}

      {isLoadingConfig ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((data) => onSubmit(data as StationCalibrationDocument))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VARIABLES.map((v) => {
              const baseName = v.key as keyof StationCalibrationDocument;
              const watchEnabled = form.watch(`${baseName}.enabled` as any);
              const watchMethod = form.watch(`${baseName}.method` as any);
              
              return (
                <Card key={v.key} className={`border ${watchEnabled ? 'border-indigo-200 dark:border-indigo-900' : 'border-slate-200 dark:border-slate-800'}`}>
                  <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-sm">{v.label} <span className="text-xs text-slate-400 font-normal ml-1">({v.unit})</span></div>
                      <Controller
                        name={`${baseName}.enabled` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Switch checked={field.value as unknown as boolean} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Metode Koreksi</Label>
                      <Controller
                        name={`${baseName}.method` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Select disabled={!(watchEnabled as unknown as boolean)} value={field.value as unknown as string} onValueChange={field.onChange}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {METHODS.map(m => (
                                <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    
                    {/* Render input fields based on chosen method */}
                    {(watchMethod as unknown as string) === "percentage" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Persentase (%)</Label>
                        <Controller
                          name={`${baseName}.percentage` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input disabled={!(watchEnabled as unknown as boolean)} type="number" step="0.01" className="h-8 text-sm" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          )}
                        />
                      </div>
                    )}
                    
                    {((watchMethod as unknown as string) === "offset" || (watchMethod as unknown as string) === "scale_offset") && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Offset (+/-)</Label>
                        <Controller
                          name={`${baseName}.offset` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input disabled={!(watchEnabled as unknown as boolean)} type="number" step="0.01" className="h-8 text-sm" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          )}
                        />
                      </div>
                    )}
                    
                    {((watchMethod as unknown as string) === "scale" || (watchMethod as unknown as string) === "scale_offset") && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Scale (Multiplier)</Label>
                        <Controller
                          name={`${baseName}.scale` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input disabled={!(watchEnabled as unknown as boolean)} type="number" step="0.001" min="0" className="h-8 text-sm" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          )}
                        />
                      </div>
                    )}
                    
                    {(watchMethod as unknown as string) === "multiplier" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Multiplier</Label>
                        <Controller
                          name={`${baseName}.multiplier` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input disabled={!(watchEnabled as unknown as boolean)} type="number" step="0.001" min="0" className="h-8 text-sm" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Preview Chart */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
              <div className="font-semibold text-sm">Visualisasi Preview Kalibrasi</div>
              <Select value={previewVar} onValueChange={setPreviewVar}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
                  <SelectValue placeholder="Pilih Variabel" />
                </SelectTrigger>
                <SelectContent>
                  {VARIABLES.map(v => (
                    <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <CalibrationPreviewChart 
                stationId={selectedStation} 
                config={form.watch() as StationCalibrationDocument}
                previewVariable={previewVar}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-3 pt-6 border-t">
             <Button type="button" variant="outline" onClick={() => form.reset()}>
               <Undo2 className="h-4 w-4 mr-2" /> Reset Perubahan
             </Button>
             <Button type="submit" disabled={isSaving || !selectedStation} className="bg-indigo-600 hover:bg-indigo-700">
               {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
               Simpan Kalibrasi
             </Button>
          </div>
        </form>
      )}
    </div>
  );
}
