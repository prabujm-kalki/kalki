import { Building2, CalendarRange } from "lucide-react";
import Link from "next/link";

export default function HallBookingDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hall Booking</h1>
        <p className="text-muted-foreground">Manage your functional halls and event reservations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/hall-booking/halls" className="transition-all hover:scale-[1.02]">
          <div className="kalki-card">
            <div className="kalki-card-header flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Manage Halls</h3>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="kalki-card-content">
              <div className="text-2xl font-bold">Configuration</div>
              <p className="text-xs text-muted-foreground mt-1">Set up capacities and pricing</p>
            </div>
          </div>
        </Link>
        <Link href="/hall-booking/bookings" className="transition-all hover:scale-[1.02]">
          <div className="kalki-card">
            <div className="kalki-card-header flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Reservations</h3>
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="kalki-card-content">
              <div className="text-2xl font-bold">Bookings</div>
              <p className="text-xs text-muted-foreground mt-1">View and manage schedules</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
