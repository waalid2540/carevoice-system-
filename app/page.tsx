import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  Clock,
  Monitor,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Volume2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">CareVoice System</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="default">Try Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automated Audio Announcements
            <br />
            <span className="text-blue-600">for Care Centers</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Schedule and play announcements for exercise time, lunch breaks, nap
            time, and more. Keep your care center running smoothly with
            automated audio on any TV or tablet.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                Try Demo Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No sign-up required. Explore the full dashboard.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need for Scheduled Announcements
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">
                Set up daily, weekly, or custom schedules. Announcements play
                automatically at the right time.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <Monitor className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Any Device</h3>
              <p className="text-gray-600">
                Works on Smart TVs, Android tablets, iPads, and any device with
                a web browser.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Emergency Alerts</h3>
              <p className="text-gray-600">
                Send instant announcements to all devices with one click for
                emergency situations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">
            Perfect for Care Centers
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Whether you run an adult day care or child care center, CareVoice System
            helps you maintain a consistent schedule.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Adult Day Care</h3>
              <ul className="space-y-3">
                {[
                  "Morning exercise reminders",
                  "Medication time alerts",
                  "Meal announcements",
                  "Activity transitions",
                  "Rest period notifications",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Child Care</h3>
              <ul className="space-y-3">
                {[
                  "Nap time announcements",
                  "Snack and lunch reminders",
                  "Clean up time alerts",
                  "Outdoor play transitions",
                  "Pick-up time notifications",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 text-center mb-12">
            One plan with everything you need
          </p>
          <div className="max-w-md mx-auto bg-white border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold">Professional</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-green-600 mt-2">14-day free trial</p>
            </div>
            <ul className="space-y-4 mb-8">
              {[
                "Up to 5 rooms",
                "Up to 10 devices",
                "Unlimited announcements",
                "Unlimited schedules",
                "Text-to-speech & MP3 audio",
                "Emergency broadcasts",
                "Offline mode support",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard">
              <Button className="w-full" size="lg">
                Try Demo
              </Button>
            </Link>
            <p className="text-sm text-gray-500 text-center mt-4">
              Demo mode - no sign-up required
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "What devices can I use?",
                a: "CareVoice System works on any device with a modern web browser - Smart TVs, Android tablets, iPads, laptops, and desktop computers.",
              },
              {
                q: "How does the pairing process work?",
                a: "Simply create a device in your dashboard, and you'll get a 6-digit code. Enter this code on your TV or tablet to connect it to your account.",
              },
              {
                q: "What happens if my internet goes down?",
                a: "CareVoice System includes offline support. Your devices will continue playing scheduled announcements using cached data until the connection is restored.",
              },
              {
                q: "Can I use my own audio files?",
                a: "Yes! You can upload MP3 files or use our text-to-speech feature to create announcements.",
              },
              {
                q: "Is there a setup fee?",
                a: "No setup fee! We offer optional white-glove onboarding for $149 if you'd like us to configure everything for you.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your announcements?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join hundreds of care centers using CareVoice System to keep their
            facilities running smoothly.
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8"
            >
              Try Demo Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Volume2 className="h-6 w-6 text-blue-600" />
              <span className="font-bold">CareVoice System</span>
            </div>
            <div className="flex items-center gap-4">
              <Shield className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                HIPAA-conscious design. Your data is secure.
              </span>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CareVoice System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
