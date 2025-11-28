"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Target,
  Database,
  RefreshCw,
  AlertCircle,
  Download,
} from "lucide-react";
import { audienceApi, apiWithFallback, demoData } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

interface AudienceData {
  ageGroups: string[];
  genders: string[];
  locations: string[];
  industries: string[];
  targetCount: number;
  dataSource: string;
}

interface AudienceSelectorProps {
  createdSurvey: any;
  surveySettings: any;
  audience: AudienceData;
  onAudienceUpdate: (audience: AudienceData) => void;
  onUserUniqueIdsUpdate: (userUniqueIds: string[]) => void;
}

const ageGroupOptions = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function AudienceSelector({
  createdSurvey,
  surveySettings,
  audience,
  onAudienceUpdate,
  onUserUniqueIdsUpdate,
}: AudienceSelectorProps) {
  console.log(">>>>>> the value of the CREATED SURVEY is : ", createdSurvey);
  console.log(">>>>>> the value of the SURVEY SETTINGS is : ", surveySettings);

  const [customTarget, setCustomTarget] = useState(
    audience.targetCount.toString()
  );
  const [file, setFile] = useState<File | null>(null);

  // Fetch audience statistics from API
  const {
    data: audienceStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi(() =>
    apiWithFallback(
      () => audienceApi.getAudienceStats(),
      demoData.audienceStats
    )
  );

  const stats = audienceStats || demoData.audienceStats;

  // Calculate estimated reach based on selected criteria
  const calculateEstimatedReach = () => {
    if (!stats) return 0;
    let estimatedReach = 0;

    // Calculate based on age groups
    if (audience.ageGroups.length > 0) {
      const ageReach = audience.ageGroups.reduce((sum, ageGroup) => {
        return sum + (stats.byAgeGroup[ageGroup] || 0);
      }, 0);
      estimatedReach = Math.max(estimatedReach, ageReach);
    }

    // Calculate based on industries
    if (audience.industries.length > 0) {
      const industryReach = audience.industries.reduce((sum, industry) => {
        return sum + (stats.byIndustry[industry] || 0);
      }, 0);
      estimatedReach = Math.max(estimatedReach, industryReach);
    }

    // Calculate based on locations (countries)
    if (audience.locations.length > 0) {
      const locationReach = audience.locations.reduce((sum, location) => {
        return sum + (stats.byCountry[location] || 0);
      }, 0);
      estimatedReach = Math.max(estimatedReach, locationReach);
    }

    // If no specific criteria selected, use total active audience
    if (
      audience.ageGroups.length === 0 &&
      audience.industries.length === 0 &&
      audience.locations.length === 0
    ) {
      estimatedReach = stats.active;
    }

    // Apply intersection logic for more accurate estimation
    if (audience.ageGroups.length > 0 && audience.industries.length > 0) {
      // Rough estimation: reduce by 30% for intersection
      estimatedReach = Math.floor(estimatedReach * 0.7);
    }

    return Math.min(estimatedReach, stats.total);
  };

  const estimatedReach = calculateEstimatedReach();

  const handleMultiSelect = (field: keyof AudienceData, value: string) => {
    const currentValues = audience[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onAudienceUpdate({
      ...audience,
      [field]: newValues,
    });
  };

  const handleTargetCountChange = (value: string) => {
    setCustomTarget(value);
    const numValue = Number.parseInt(value) || 0;
    onAudienceUpdate({
      ...audience,
      targetCount: numValue,
    });
  };

  const getAvailableOptions = (type: "locations" | "industries") => {
    if (!stats) return [];

    if (type === "locations") {
      return Object.keys(stats.byCountry);
    } else {
      return Object.keys(stats.byIndustry);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Handle file upload logic here
      console.log("File selected:", selectedFile);

      // Validate file type
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        toast.error("Please upload a valid Excel file (.xlsx or .xls)");
        setFile(null);
        return;
      }

      // Parse and validate Excel file
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
          console.log("jsonData is", jsonData);

          // Example validation: check if the file has a column named 'userId'
          if (
            !jsonData.length ||
            !jsonData[0].hasOwnProperty("userUniqueIds")
          ) {
            toast.error(
              'Excel file must contain a column named "userUniqueIds"'
            );
            // setError('Excel file must contain a column named "userId"');
            setFile(null);
            return;
          }

          setFile(selectedFile);
          // setError("");

          console.log("Valid Excel file uploaded:", jsonData);

          const userUniqueIds = jsonData.map((row) => row.userUniqueIds);
          console.log("userUniqueIds is", userUniqueIds);

          onUserUniqueIdsUpdate(userUniqueIds);

          toast.success("Excel file uploaded successfully!");
        } catch (err) {
          toast.error("Error reading Excel file. Please upload a valid file.");
          // setError("Error reading Excel file. Please upload a valid file.");
          setFile(null);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDownloadDummyExcel = () => {
    try {
      // Prepare worksheet data, header row first
      const excelData = ["9013kjn9832nsd89sds", "879fgdf990fd7gsd98"];
      const worksheetData = [
        ["userUniqueIds"], // header row
        ...excelData.map((item: any) => [item]),
      ];

      // Create worksheet and workbook
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyLinks");

      // Trigger download
      XLSX.writeFile(workbook, "Agent Users List Template.xlsx");
    } catch (error) {
      toast.error("Failed to download Excel");
    }
  };

  return (
    <div>
      {surveySettings.survey_send_by == "AGENT" ? (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Agent Mode
          </h2>
          <p className="text-slate-500">
            Please select the Excel File with the user unique Id's list
          </p>

          <div className="mt-2 flex gap-3">
            <label
              htmlFor="excel-upload"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md mt-4"
              // className="justify-start h-auto p-3 text-left cursor-pointer border"
            >
              Upload Excel
            </label>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => handleDownloadDummyExcel()}
              className="h-10 px-4 py-2 rounded-md mt-4"
            >
              <Download className="h-4 w-4" />
              Download Excel Template
            </Button>
          </div>
          {file && (
            <p className="text-green-500 mt-2">
              File uploaded successfully: {file.name}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Define Target Audience
            </h2>
            <p className="text-slate-500">
              Select criteria to target specific audience segments for your
              survey
            </p>
          </div>

          {/* Error Display */}
          {statsError && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Unable to load live audience data. Using demo data for
                  calculations.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetchStats}
                disabled={statsLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Audience Criteria */}
            <div className="lg:col-span-2 space-y-4">
              {/* Age Groups */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Age Groups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {ageGroupOptions.map((ageGroup) => (
                      <Button
                        key={ageGroup}
                        variant={
                          audience.ageGroups.includes(ageGroup)
                            ? "default"
                            : "outline"
                        }
                        className="justify-start h-auto p-3 text-left"
                        onClick={() => handleMultiSelect("ageGroups", ageGroup)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{ageGroup}</div>
                          <div className="text-xs opacity-70">
                            {statsLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              `${(
                                stats?.byAgeGroup[ageGroup] || 0
                              ).toLocaleString()} people`
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gender */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Gender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {genderOptions.map((gender) => (
                      <Button
                        key={gender}
                        variant={
                          audience.genders.includes(gender)
                            ? "default"
                            : "outline"
                        }
                        className="justify-start h-auto p-3"
                        onClick={() => handleMultiSelect("genders", gender)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{gender}</div>
                          <div className="text-xs opacity-70">
                            {statsLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              `${(
                                stats?.byGender[gender] || 0
                              ).toLocaleString()} people`
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAvailableOptions("locations").map((location) => (
                      <Button
                        key={location}
                        variant={
                          audience.locations.includes(location)
                            ? "default"
                            : "outline"
                        }
                        className="justify-start h-auto p-3"
                        onClick={() => handleMultiSelect("locations", location)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{location}</div>
                          <div className="text-xs opacity-70">
                            {statsLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              `${(
                                stats?.byCountry[location] || 0
                              ).toLocaleString()} people`
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Industries */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Industries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {getAvailableOptions("industries").map((industry) => (
                      <Button
                        key={industry}
                        variant={
                          audience.industries.includes(industry)
                            ? "default"
                            : "outline"
                        }
                        className="justify-start h-auto p-3"
                        onClick={() =>
                          handleMultiSelect("industries", industry)
                        }
                      >
                        <div className="text-left">
                          <div className="font-medium">{industry}</div>
                          <div className="text-xs opacity-70">
                            {statsLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              `${(
                                stats?.byIndustry[industry] || 0
                              ).toLocaleString()} people`
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Target */}
            <div className="space-y-6">
              {/* Audience Summary */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Audience Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Age Groups
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {audience.ageGroups.length > 0 ? (
                          audience.ageGroups.map((age) => (
                            <Badge
                              key={age}
                              variant="secondary"
                              className="text-xs"
                            >
                              {age}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            All ages
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Gender
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {audience.genders.length > 0 ? (
                          audience.genders.map((gender) => (
                            <Badge
                              key={gender}
                              variant="secondary"
                              className="text-xs"
                            >
                              {gender}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            All genders
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Locations
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {audience.locations.length > 0 ? (
                          audience.locations.map((location) => (
                            <Badge
                              key={location}
                              variant="secondary"
                              className="text-xs"
                            >
                              {location}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            All locations
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Industries
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {audience.industries.length > 0 ? (
                          audience.industries.map((industry) => (
                            <Badge
                              key={industry}
                              variant="secondary"
                              className="text-xs"
                            >
                              {industry}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            All industries
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">
                        Estimated Reach
                      </span>
                      <span className="text-lg font-bold text-violet-600">
                        {statsLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          estimatedReach.toLocaleString()
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Based on current audience database
                      {!statsLoading && statsError && " (demo data)"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target Count */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Survey Target</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="target-count"
                      className="text-sm font-medium"
                    >
                      Target Response Count
                    </Label>
                    <Input
                      id="target-count"
                      type="number"
                      value={customTarget}
                      onChange={(e) => handleTargetCountChange(e.target.value)}
                      className="mt-2"
                      min="1"
                      max={estimatedReach}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Maximum: {estimatedReach.toLocaleString()} (based on
                      selected criteria)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Target</span>
                      <span className="font-medium">
                        {audience.targetCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Available</span>
                      <span className="font-medium">
                        {estimatedReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Coverage</span>
                      <span className="font-medium">
                        {estimatedReach > 0
                          ? Math.round(
                              (audience.targetCount / estimatedReach) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>

                  {audience.targetCount > estimatedReach && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        ⚠️ Target exceeds available audience. Consider adjusting
                        criteria or target count.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Source */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={audience.dataSource}
                    onValueChange={(value) =>
                      onAudienceUpdate({ ...audience, dataSource: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Default Audience Database
                      </SelectItem>
                      <SelectItem value="imported">
                        Imported Contacts
                      </SelectItem>
                      <SelectItem value="segments">Custom Segments</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-2">
                    Choose the source for your survey distribution
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
