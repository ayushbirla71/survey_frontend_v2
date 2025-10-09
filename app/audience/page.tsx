"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Users,
  MapPin,
  Briefcase,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { BarChart, PieChart } from "@/components/ui/chart";
import ImportDialog from "@/components/import-dialog";
import { audienceApi, apiWithFallback } from "@/lib/api";
import { usePaginatedApi, useApi, useMutation } from "@/hooks/useApi";
import { audienceData, audienceStats } from "@/lib/assist-data";

export default function AudiencePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // API calls
  const {
    data: audience,
    pagination,
    loading: audienceLoading,
    error: audienceError,
    updateParams,
    refetch: refetchAudience,
  } = usePaginatedApi((params) => audienceApi.getAudience(params), {
    page: 1,
    limit: 50,
    search: searchQuery || undefined,
    ageGroup: ageFilter === "all" ? undefined : ageFilter,
    gender: genderFilter === "all" ? undefined : genderFilter,
    country: countryFilter === "all" ? undefined : countryFilter,
    industry: industryFilter === "all" ? undefined : industryFilter,
  });

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi(() =>
    apiWithFallback(() => audienceApi.getAudienceStats(), audienceStats)
  );

  const {
    data: segments,
    loading: segmentsLoading,
    refetch: refetchSegments,
  } = useApi(() => audienceApi.getSegments());

  // Mutations
  const { mutate: importAudience, loading: importLoading } = useMutation(
    audienceApi.importAudience
  );
  const { mutate: createSegment, loading: createSegmentLoading } = useMutation(
    audienceApi.createSegment
  );

  // Fallback to local data if API fails
  const displayAudience =
    audience ||
    audienceData
      .filter((person) => {
        const matchesSearch =
          person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.city.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAge = ageFilter === "all" || person.ageGroup === ageFilter;
        const matchesGender =
          genderFilter === "all" || person.gender === genderFilter;
        const matchesCountry =
          countryFilter === "all" || person.country === countryFilter;
        const matchesIndustry =
          industryFilter === "all" || person.industry === industryFilter;

        return (
          matchesSearch &&
          matchesAge &&
          matchesGender &&
          matchesCountry &&
          matchesIndustry &&
          person.isActive
        );
      })
      .slice(0, 50);

  const displayStats = stats || audienceStats;
  const displaySegments = segments || [
    {
      id: "seg-1",
      name: "IT Professionals (25-44)",
      description: "Age 25-44, IT Sector, Active users",
      memberCount: 2847,
      createdAt: "2023-06-01",
    },
    {
      id: "seg-2",
      name: "Healthcare Workers",
      description: "Healthcare industry, All ages",
      memberCount: 1923,
      createdAt: "2023-06-05",
    },
  ];

  // Update API params when filters change
  useState(() => {
    const timeoutId = setTimeout(() => {
      updateParams({
        page: 1,
        search: searchQuery || undefined,
        ageGroup: ageFilter === "all" ? undefined : ageFilter,
        gender: genderFilter === "all" ? undefined : genderFilter,
        country: countryFilter === "all" ? undefined : countryFilter,
        industry: industryFilter === "all" ? undefined : industryFilter,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, ageFilter, genderFilter, countryFilter, industryFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAudience(displayAudience.map((person) => person.id));
    } else {
      setSelectedAudience([]);
    }
  };

  const handleSelectPerson = (personId: string, checked: boolean) => {
    if (checked) {
      setSelectedAudience([...selectedAudience, personId]);
    } else {
      setSelectedAudience(selectedAudience.filter((id) => id !== personId));
    }
  };

  // Chart data for demographics
  const ageChartData = Object.entries(displayStats.byAgeGroup || {}).map(
    ([age, count]) => ({
      ageGroup: age,
      count: count as number,
    })
  );

  const genderChartData = Object.entries(displayStats.byGender || {}).map(
    ([gender, count]) => ({
      gender,
      count: count as number,
    })
  );

  const countryChartData = Object.entries(displayStats.byCountry || {}).map(
    ([country, count]) => ({
      country,
      count: count as number,
    })
  );

  const industryChartData = Object.entries(displayStats.byIndustry || {})
    .map(([industry, count]) => ({
      industry,
      count: count as number,
    }))
    .slice(0, 10); // Top 10 industries

  const handleImportComplete = async (file: File) => {
    const result = await importAudience(file);
    if (result) {
      setShowImportDialog(false);
      refetchAudience();
      refetchStats();
      alert(`Successfully imported ${result.imported} audience members!`);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await audienceApi.exportAudience({
        format: "csv",
        filters: {
          ageGroup: ageFilter === "all" ? undefined : ageFilter,
          gender: genderFilter === "all" ? undefined : genderFilter,
          country: countryFilter === "all" ? undefined : countryFilter,
          industry: industryFilter === "all" ? undefined : industryFilter,
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback to local export
      const csvContent = [
        [
          "Name",
          "Email",
          "Age Group",
          "Gender",
          "Location",
          "Industry",
          "Job Title",
        ].join(","),
        ...displayAudience
          .slice(0, 1000)
          .map((person) =>
            [
              `"${person.firstName} ${person.lastName}"`,
              person.email,
              person.ageGroup,
              person.gender,
              `"${person.city}, ${person.country}"`,
              person.industry,
              person.jobTitle,
            ].join(",")
          ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleRefresh = () => {
    refetchAudience();
    refetchStats();
    refetchSegments();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Audience Management
            </h1>
            <p className="text-slate-500">
              Manage your survey audience database
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={audienceLoading || statsLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  audienceLoading || statsLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowImportDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Import Audience
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {(audienceError || statsError) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Using local data - API connection failed:{" "}
              {audienceError || statsError}
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <Users className="mr-3 h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading
                    ? "..."
                    : displayStats.total?.toLocaleString() || "0"}
                </p>
                <p className="text-sm text-slate-500">Total Audience</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <Users className="mr-3 h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading
                    ? "..."
                    : displayStats.active?.toLocaleString() || "0"}
                </p>
                <p className="text-sm text-slate-500">Active Members</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <MapPin className="mr-3 h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading
                    ? "..."
                    : Object.keys(displayStats.byCountry || {}).length}
                </p>
                <p className="text-sm text-slate-500">Countries</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <Briefcase className="mr-3 h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading
                    ? "..."
                    : Object.keys(displayStats.byIndustry || {}).length}
                </p>
                <p className="text-sm text-slate-500">Industries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="audience" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audience">Audience Database</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="audience" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search audience..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Age Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45-54">45-54</SelectItem>
                    <SelectItem value="55-64">55-64</SelectItem>
                    <SelectItem value="65+">65+</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                    <SelectItem value="Prefer not to say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="United Kingdom">
                      United Kingdom
                    </SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={industryFilter}
                  onValueChange={setIndustryFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="IT Sector">IT Sector</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {displayAudience.length} of{" "}
                  {pagination?.total || displayAudience.length} results
                </p>
                {selectedAudience.length > 0 && (
                  <Badge variant="secondary">
                    {selectedAudience.length} selected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {audienceLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {/* Audience Table */}
          {!audienceLoading && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedAudience.length ===
                              displayAudience.length &&
                            displayAudience.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAudience.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAudience.includes(person.id)}
                            onCheckedChange={(checked) =>
                              handleSelectPerson(person.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {person.firstName} {person.lastName}
                        </TableCell>
                        <TableCell>{person.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{person.ageGroup}</Badge>
                        </TableCell>
                        <TableCell>{person.gender}</TableCell>
                        <TableCell>
                          {person.city}, {person.country}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{person.industry}</Badge>
                        </TableCell>
                        <TableCell>{person.jobTitle}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {person.lastActivity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  updateParams({ page: Math.max(1, pagination.page - 1) })
                }
                disabled={pagination.page === 1 || audienceLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  updateParams({
                    page: Math.min(pagination.totalPages, pagination.page + 1),
                  })
                }
                disabled={
                  pagination.page === pagination.totalPages || audienceLoading
                }
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={ageChartData}
                    index="ageGroup"
                    categories={["count"]}
                    colors={["violet"]}
                    valueFormatter={(value) => `${value} people`}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={genderChartData}
                    index="gender"
                    categories={["count"]}
                    colors={["violet", "indigo", "emerald", "amber"]}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Country Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={countryChartData}
                    index="country"
                    categories={["count"]}
                    colors={["indigo"]}
                    valueFormatter={(value) => `${value} people`}
                    className="h-64"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Industries</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={industryChartData}
                    index="industry"
                    categories={["count"]}
                    colors={["emerald"]}
                    valueFormatter={(value) => `${value} people`}
                    className="h-64"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Audience Segments</CardTitle>
              <p className="text-slate-500">
                Create and manage audience segments for targeted surveys
              </p>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {displaySegments.map((segment) => (
                    <div key={segment.id} className="rounded-lg border p-4">
                      <h3 className="font-medium">{segment.name}</h3>
                      <p className="text-sm text-slate-500">
                        {segment.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge>
                          {segment.memberCount.toLocaleString()} members
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    disabled={createSegmentLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Segment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showImportDialog && (
        <ImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
