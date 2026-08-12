import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  CalendarCheck,
  Plus,
  Play,
  Eye,
  Send,
  X,
  ChevronDown,
  Settings2,
} from "lucide-react";

const VivaManagementDashboard = () => {
  const [stats, setStats] = useState({
    activePeriods: 0,
    totalAvailabilities: 0,
    totalSchedules: 0,
  });

  const [periods, setPeriods] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    type: "Proposal Viva",
    start_date: "",
    end_date: "",
    daily_start_time: "08:00",
    daily_end_time: "19:00",
    slot_duration: "30",
  });

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-user-role": "admin",
  };

  // ----------------------------------------------------
  // FETCH DASHBOARD
  // ----------------------------------------------------

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch("/api/viva/dashboard", {
        headers: adminHeaders,
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();

        setStats({
          activePeriods: statsData.activePeriods || 0,
          totalAvailabilities: statsData.totalAvailabilities || 0,
          totalSchedules: statsData.totalSchedules || 0,
        });
      }

      const periodsRes = await fetch("/api/viva/periods", {
        headers: adminHeaders,
      });

      if (periodsRes.ok) {
        const periodsData = await periodsRes.json();
        setPeriods(periodsData);
      }
    } catch (error) {
      console.error("Failed to load viva dashboard:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ----------------------------------------------------
  // CREATE PERIOD
  // ----------------------------------------------------

  const handleCreatePeriod = async (e) => {
    e.preventDefault();

    if (formData.start_date > formData.end_date) {
      alert("End date cannot be before start date.");
      return;
    }

    try {
      const res = await fetch("/api/viva/periods", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          type: formData.type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          daily_start_time: formData.daily_start_time,
          daily_end_time: formData.daily_end_time,
          slot_duration: Number(formData.slot_duration),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Failed to create Viva period.");
        return;
      }

      alert("Viva period created successfully.");

      setShowCreateModal(false);

      setFormData({
        type: "Proposal Viva",
        start_date: "",
        end_date: "",
        daily_start_time: "08:00",
        daily_end_time: "19:00",
        slot_duration: "30",
      });

      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert("Error creating Viva period.");
    }
  };

  // ----------------------------------------------------
  // PUBLISH PERIOD
  // ----------------------------------------------------

  const handlePublishPeriod = async (periodId) => {
    try {
      const res = await fetch(
        `/api/viva/periods/${periodId}/publish`,
        {
          method: "PUT",
          headers: adminHeaders,
        }
      );

      if (!res.ok) {
        alert("Failed to publish Viva period.");
        return;
      }

      alert(
        "Viva period published. Students, supervisors and assessors can now submit availability."
      );

      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert("Error publishing Viva period.");
    }
  };

  // ----------------------------------------------------
  // AUTO SCHEDULE
  // ----------------------------------------------------

  const handleAutoSchedule = async (periodId) => {
    try {
      const res = await fetch(
        `/api/viva/periods/${periodId}/generate`,
        {
          method: "POST",
          headers: adminHeaders,
        }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Scheduling failed.");
        return;
      }

      alert("Viva schedules generated successfully.");

      fetchDashboardData();

      if (expandedPeriod === periodId) {
        loadSchedules(periodId);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating schedules.");
    }
  };

  // ----------------------------------------------------
  // VIEW SCHEDULES
  // ----------------------------------------------------

  const loadSchedules = async (periodId) => {
    if (expandedPeriod === periodId) {
      setExpandedPeriod(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/viva/periods/${periodId}/schedules`,
        {
          headers: adminHeaders,
        }
      );

      if (res.ok) {
        const data = await res.json();

        setSchedules(data);
        setExpandedPeriod(periodId);
      }
    } catch (error) {
      console.error("Failed to load schedules:", error);
    }
  };

  // ----------------------------------------------------
  // PUBLISH SCHEDULES
  // ----------------------------------------------------

  const handlePublishSchedules = async (periodId) => {
    try {
      const res = await fetch(
        `/api/viva/periods/${periodId}/schedules/publish`,
        {
          method: "PUT",
          headers: adminHeaders,
        }
      );

      if (!res.ok) {
        alert("Failed to publish schedules.");
        return;
      }

      alert(
        "Schedules published successfully. Participants can now view their Viva schedule."
      );

      fetchDashboardData();
      loadSchedules(periodId);
    } catch (error) {
      console.error(error);
      alert("Error publishing schedules.");
    }
  };

  // ----------------------------------------------------
  // FORMAT DATE
  // ----------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ----------------------------------------------------
  // FORMAT TIME
  // ----------------------------------------------------

  const formatTime = (time) => {
    if (!time) return "—";

    const [hours, minutes] = time.split(":");

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* PAGE HEADER */}
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Viva Scheduling
            </h1>

            <p className="text-slate-500 mt-1">
              Create Viva periods, collect availability and generate schedules.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition"
          >
            <Plus size={18} />
            Create Viva Period
          </button>

        </div>

        {/* ------------------------------------------------ */}
        {/* STATS */}
        {/* ------------------------------------------------ */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

          <StatCard
            icon={<CalendarCheck size={22} />}
            title="Active Viva Periods"
            value={stats.activePeriods}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />

          <StatCard
            icon={<Users size={22} />}
            title="Availabilities Submitted"
            value={stats.totalAvailabilities}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />

          <StatCard
            icon={<Clock3 size={22} />}
            title="Generated Schedules"
            value={stats.totalSchedules}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />

        </div>

        {/* ------------------------------------------------ */}
        {/* EXPLANATION CARD */}
        {/* ------------------------------------------------ */}

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8">

          <div className="flex gap-4">

            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <CalendarDays size={20} />
            </div>

            <div>

              <h3 className="font-semibold text-indigo-900">
                How Viva availability works
              </h3>

              <p className="text-sm text-indigo-700 mt-1 leading-relaxed">
                The Viva period defines the dates and daily hours during which
                Viva sessions can be scheduled. Students, supervisors and
                assessors will select the specific time slots they are
                available for.
              </p>

            </div>

          </div>

        </div>

        {/* ------------------------------------------------ */}
        {/* ACTIVE PERIODS */}
        {/* ------------------------------------------------ */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">

          <div className="px-6 py-5 border-b border-slate-200">

            <h2 className="text-xl font-bold text-slate-900">
              Viva Periods
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Manage current and upcoming Viva scheduling periods.
            </p>

          </div>

          <div className="p-6">

            {periods.length === 0 ? (

              <div className="text-center py-16">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <CalendarDays size={30} />
                </div>

                <h3 className="text-lg font-semibold text-slate-800">
                  No Viva periods yet
                </h3>

                <p className="text-sm text-slate-500 mt-1 mb-5">
                  Create a Viva period to start collecting availability.
                </p>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
                >
                  <Plus size={16} />
                  Create Viva Period
                </button>

              </div>

            ) : (

              <div className="space-y-4">

                {periods.map((period) => (

                  <div
                    key={period.id}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >

                    {/* PERIOD HEADER */}

                    <div className="p-5">

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div className="flex gap-4">

                          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <CalendarDays size={22} />
                          </div>

                          <div>

                            <div className="flex items-center gap-3 flex-wrap">

                              <h3 className="font-bold text-lg text-slate-900">
                                {period.type}
                              </h3>

                              <StatusBadge status={period.status} />

                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500">

                              <span>
                                <strong className="text-slate-700">
                                  Dates:
                                </strong>{" "}
                                {formatDate(period.start_date)} –{" "}
                                {formatDate(period.end_date)}
                              </span>

                              <span>
                                <strong className="text-slate-700">
                                  Daily hours:
                                </strong>{" "}
                                {formatTime(period.daily_start_time)} –{" "}
                                {formatTime(period.daily_end_time)}
                              </span>

                              <span>
                                <strong className="text-slate-700">
                                  Slot:
                                </strong>{" "}
                                {period.slot_duration || 30} minutes
                              </span>

                            </div>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          {period.status === "Draft" && (

                            <button
                              onClick={() =>
                                handlePublishPeriod(period.id)
                              }
                              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                              <Send size={15} />
                              Publish
                            </button>

                          )}

                          {(period.status ===
                            "Availability Collection" ||
                            period.status === "Scheduling") && (

                              <button
                                onClick={() =>
                                  handleAutoSchedule(period.id)
                                }
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                              >
                                <Play size={15} />
                                Auto-Schedule
                              </button>

                            )}

                          <button
                            onClick={() =>
                              loadSchedules(period.id)
                            }
                            className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            <Eye size={15} />

                            {expandedPeriod === period.id
                              ? "Hide"
                              : "View"}{" "}
                            Schedules

                            <ChevronDown
                              size={15}
                              className={
                                expandedPeriod === period.id
                                  ? "rotate-180 transition"
                                  : "transition"
                              }
                            />

                          </button>

                        </div>

                      </div>

                    </div>

                    {/* ------------------------------------------------ */}
                    {/* SCHEDULES */}
                    {/* ------------------------------------------------ */}

                    {expandedPeriod === period.id && (

                      <div className="border-t border-slate-200 bg-slate-50 p-5">

                        <div className="flex items-center justify-between mb-4">

                          <div>

                            <h4 className="font-semibold text-slate-900">
                              Generated Schedules
                            </h4>

                            <p className="text-sm text-slate-500">
                              Review automatically generated Viva sessions.
                            </p>

                          </div>

                          {schedules.length > 0 && (

                            <button
                              onClick={() =>
                                handlePublishSchedules(period.id)
                              }
                              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                              <Send size={15} />
                              Publish Schedules
                            </button>

                          )}

                        </div>

                        {schedules.length === 0 ? (

                          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">

                            <Clock3
                              size={30}
                              className="mx-auto text-slate-400 mb-3"
                            />

                            <p className="font-medium text-slate-700">
                              No schedules generated
                            </p>

                            <p className="text-sm text-slate-500 mt-1">
                              Generate schedules after availability
                              collection is complete.
                            </p>

                          </div>

                        ) : (

                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                            <div className="overflow-x-auto">

                              <table className="w-full text-sm">

                                <thead className="bg-slate-100">

                                  <tr>

                                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                                      Student
                                    </th>

                                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                                      Date
                                    </th>

                                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                                      Time
                                    </th>

                                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                                      Mode
                                    </th>

                                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                                      Status
                                    </th>

                                  </tr>

                                </thead>

                                <tbody>

                                  {schedules.map((schedule) => (

                                    <tr
                                      key={schedule.id}
                                      className="border-t border-slate-100 hover:bg-slate-50"
                                    >

                                      <td className="px-5 py-4 font-medium text-slate-900">

                                        {schedule.students
                                          ?.student_name ||
                                          `Student ${schedule.student_id}`}

                                      </td>

                                      <td className="px-5 py-4 text-slate-600">

                                        {formatDate(schedule.date)}

                                      </td>

                                      <td className="px-5 py-4 text-slate-600">

                                        {schedule.start_time &&
                                          schedule.end_time
                                          ? `${formatTime(
                                            schedule.start_time
                                          )} – ${formatTime(
                                            schedule.end_time
                                          )}`
                                          : "—"}

                                      </td>

                                      <td className="px-5 py-4">

                                        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                                          {schedule.mode || "Online"}
                                        </span>

                                      </td>

                                      <td className="px-5 py-4">

                                        <StatusBadge
                                          status={
                                            schedule.status
                                          }
                                        />

                                      </td>

                                    </tr>

                                  ))}

                                </tbody>

                              </table>

                            </div>

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* CREATE VIVA PERIOD MODAL */}
      {/* ====================================================== */}

      {showCreateModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* BACKDROP */}

          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          {/* MODAL */}

          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Create Viva Period
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Define when Viva sessions can be scheduled.
                </p>

              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleCreatePeriod}
              className="p-6 space-y-6"
            >

              {/* VIVA TYPE */}

              <div>

                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Viva Type
                </label>

                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >

                  <option>Proposal Viva</option>
                  <option>Midpoint Viva</option>
                  <option>Final Viva</option>

                </select>

              </div>

              {/* DATE RANGE */}

              <div>

                <div className="flex items-center gap-2 mb-3">

                  <CalendarDays
                    size={18}
                    className="text-indigo-600"
                  />

                  <h3 className="font-semibold text-slate-800">
                    Viva Period
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm text-slate-600 mb-1">
                      Start Date
                    </label>

                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                  </div>

                  <div>

                    <label className="block text-sm text-slate-600 mb-1">
                      End Date
                    </label>

                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          end_date: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                  </div>

                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Example: 12 August – 22 August. Viva sessions can be
                  scheduled on any selected date within this period.
                </p>

              </div>

              {/* DAILY HOURS */}

              <div>

                <div className="flex items-center gap-2 mb-3">

                  <Clock3
                    size={18}
                    className="text-indigo-600"
                  />

                  <h3 className="font-semibold text-slate-800">
                    Daily Available Hours
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm text-slate-600 mb-1">
                      From
                    </label>

                    <input
                      type="time"
                      required
                      value={formData.daily_start_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          daily_start_time: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                  </div>

                  <div>

                    <label className="block text-sm text-slate-600 mb-1">
                      Until
                    </label>

                    <input
                      type="time"
                      required
                      value={formData.daily_end_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          daily_end_time: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                  </div>

                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Example: 8:00 AM – 7:00 PM. Participants will see
                  selectable time slots within these hours.
                </p>

              </div>

              {/* SLOT DURATION */}

              <div>

                <div className="flex items-center gap-2 mb-3">

                  <Settings2
                    size={18}
                    className="text-indigo-600"
                  />

                  <h3 className="font-semibold text-slate-800">
                    Time Slot Duration
                  </h3>

                </div>

                <select
                  value={formData.slot_duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slot_duration: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                >

                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>

                </select>

                <p className="text-xs text-slate-500 mt-2">
                  This determines the time slots participants can select.
                </p>

              </div>

              {/* PREVIEW */}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Example
                </p>

                <p className="text-sm text-slate-700">

                  <strong>{formData.type}</strong> will run from{" "}

                  <strong>
                    {formData.start_date || "12 Aug"}
                  </strong>{" "}

                  to{" "}

                  <strong>
                    {formData.end_date || "22 Aug"}
                  </strong>{" "}

                  with available slots between{" "}

                  <strong>
                    {formatTime(formData.daily_start_time)}
                  </strong>{" "}

                  and{" "}

                  <strong>
                    {formatTime(formData.daily_end_time)}
                  </strong>
                  .

                </p>

              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Create Viva Period
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};


// ==========================================================
// STAT CARD
// ==========================================================

const StatCard = ({
  icon,
  title,
  value,
  iconBg,
  iconColor,
}) => (

  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

    <div className="flex items-center justify-between">

      <div>

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <p className="text-3xl font-bold text-slate-900 mt-2">
          {value}
        </p>

      </div>

      <div
        className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}
      >
        {icon}
      </div>

    </div>

  </div>

);


// ==========================================================
// STATUS BADGE
// ==========================================================

const StatusBadge = ({ status }) => {

  const styles = {

    Draft:
      "bg-slate-100 text-slate-600",

    "Availability Collection":
      "bg-blue-100 text-blue-700",

    Scheduling:
      "bg-amber-100 text-amber-700",

    Scheduled:
      "bg-indigo-100 text-indigo-700",

    Published:
      "bg-emerald-100 text-emerald-700",

    Completed:
      "bg-slate-100 text-slate-600",

  };

  return (

    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"
        }`}
    >
      {status || "Draft"}
    </span>

  );
};

export default VivaManagementDashboard;