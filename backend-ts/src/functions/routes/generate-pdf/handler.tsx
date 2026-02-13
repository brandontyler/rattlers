/**
 * Lambda function to generate a PDF route guide.
 *
 * POST /routes/generate-pdf
 *
 * Uses @react-pdf/renderer to create a festive, printable PDF
 * with route stops, navigation QR codes, and driving directions.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
  Svg,
  Circle,
  Rect,
  Path,
  Line,
  G,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import * as QRCode from "qrcode";
import { successResponse, validationError, badRequestError, internalError } from "@shared/utils/responses";
import { generatePdfSchema, parseJsonBody } from "@shared/utils/validation";
import type { GeneratePdfInput } from "@shared/utils/validation";

// Disable hyphenation to prevent crashes with built-in fonts
Font.registerHyphenationCallback((word: string) => [word]);

const s3Client = new S3Client({});
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET_NAME ?? "";
const PDF_EXPIRATION_SECONDS = 3600; // 1 hour

// ----- Types -----

interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  description?: string;
  photos?: string[];
}

interface RouteStats {
  totalMiles: number;
  estimatedMinutes: number;
  stopCount: number;
}

interface StopDistance {
  miles: number;
  minutes: number;
}

// ----- Colors -----

const colors = {
  darkGreen: "#15803d",
  richRed: "#b91c1c",
  warmGold: "#b45309",
  charcoal: "#374151",
  mediumGray: "#6b7280",
  lightGray: "#e5e7eb",
  offWhite: "#f9fafb",
  white: "#ffffff",
  snow: "#fef2f2",
  pine: "#f0fdf4",
};

// ----- Haversine -----

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateRouteStats(stops: RouteStop[]): RouteStats {
  const stopCount = stops.length;
  if (stopCount === 0) return { totalMiles: 0, estimatedMinutes: 0, stopCount: 0 };

  const ROAD_FACTOR = 1.3;
  let totalMiles = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    totalMiles += calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng) * ROAD_FACTOR;
  }

  // 5 min viewing per stop + driving at 20 mph
  const viewingTime = stopCount * 5;
  const drivingTime = (totalMiles / 20) * 60;
  const estimatedMinutes = Math.round(viewingTime + drivingTime);

  return {
    totalMiles: Math.round(totalMiles * 10) / 10,
    estimatedMinutes,
    stopCount,
  };
}

function getStopDistances(stops: RouteStop[]): StopDistance[] {
  const ROAD_FACTOR = 1.3;
  const distances: StopDistance[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const miles = calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng) * ROAD_FACTOR;
    const minutes = Math.round((miles / 20) * 60);
    distances.push({ miles: Math.round(miles * 10) / 10, minutes: Math.max(1, minutes) });
  }
  return distances;
}

// ----- Navigation URLs -----

function buildGoogleMapsUrl(stops: RouteStop[]): string {
  if (stops.length === 0) return "";
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
  }
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

// ----- QR Code generation -----

async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 140,
    margin: 1,
    color: { dark: "#1f2937", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

// ----- Decorative SVG components -----

const Snowflake = ({ x, y, size = 8, color = "#d1d5db" }: { x: number; y: number; size?: number; color?: string }) => (
  <G>
    <Line x1={x} y1={y - size} x2={x} y2={y + size} stroke={color} strokeWidth={0.8} />
    <Line x1={x - size} y1={y} x2={x + size} y2={y} stroke={color} strokeWidth={0.8} />
    <Line x1={x - size * 0.7} y1={y - size * 0.7} x2={x + size * 0.7} y2={y + size * 0.7} stroke={color} strokeWidth={0.8} />
    <Line x1={x + size * 0.7} y1={y - size * 0.7} x2={x - size * 0.7} y2={y + size * 0.7} stroke={color} strokeWidth={0.8} />
  </G>
);

const ChristmasTree = ({ x, y, size = 20 }: { x: number; y: number; size?: number }) => (
  <G>
    <Path d={`M${x},${y - size} L${x - size * 0.6},${y + size * 0.3} L${x + size * 0.6},${y + size * 0.3} Z`} fill={colors.darkGreen} />
    <Path d={`M${x},${y - size * 0.5} L${x - size * 0.8},${y + size * 0.7} L${x + size * 0.8},${y + size * 0.7} Z`} fill={colors.darkGreen} />
    <Rect x={x - size * 0.15} y={y + size * 0.7} width={size * 0.3} height={size * 0.35} fill="#8B4513" />
    <Circle cx={x} cy={y - size * 0.1} r={1.5} fill={colors.richRed} />
    <Circle cx={x - size * 0.3} cy={y + size * 0.4} r={1.5} fill={colors.warmGold} />
    <Circle cx={x + size * 0.25} cy={y + size * 0.2} r={1.5} fill={colors.richRed} />
  </G>
);

const Star = ({ x, y, size = 10 }: { x: number; y: number; size?: number }) => {
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
    points.push(`${x + size * Math.cos(outerAngle)},${y + size * Math.sin(outerAngle)}`);
    points.push(`${x + size * 0.4 * Math.cos(innerAngle)},${y + size * 0.4 * Math.sin(innerAngle)}`);
  }
  return <Path d={`M${points.join("L")}Z`} fill={colors.warmGold} />;
};

// ----- Styles -----

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: colors.white,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
  },
  // Header
  headerBand: {
    backgroundColor: colors.darkGreen,
    marginHorizontal: -40,
    marginTop: -40,
    paddingVertical: 24,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#bbf7d0",
    textAlign: "center",
  },
  // Stats bar
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.pine,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGreen,
  },
  statLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
    textTransform: "uppercase",
  },
  // QR section
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.offWhite,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  qrImage: {
    width: 90,
    height: 90,
  },
  qrText: {
    flex: 1,
    marginLeft: 14,
  },
  qrTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    marginBottom: 4,
  },
  qrDescription: {
    fontSize: 8,
    color: colors.mediumGray,
    lineHeight: 1.5,
  },
  // Section heading
  sectionHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGreen,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.darkGreen,
  },
  // Stop card
  stopCard: {
    flexDirection: "row",
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.lightGray,
    overflow: "hidden",
  },
  stopNumberCol: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  stopNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
  },
  stopContent: {
    flex: 1,
    padding: 10,
  },
  stopAddress: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    marginBottom: 3,
  },
  stopDescription: {
    fontSize: 8,
    color: colors.mediumGray,
    lineHeight: 1.4,
    maxLines: 2,
  },
  // Distance between stops
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginLeft: 14,
  },
  distanceLine: {
    width: 1,
    height: 12,
    backgroundColor: colors.lightGray,
    marginRight: 8,
  },
  distanceText: {
    fontSize: 7,
    color: colors.mediumGray,
    fontFamily: "Helvetica-Oblique",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  // Tips
  tipsSection: {
    backgroundColor: colors.snow,
    borderRadius: 6,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  tipsTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.richRed,
    marginBottom: 6,
  },
  tipItem: {
    fontSize: 8,
    color: colors.charcoal,
    lineHeight: 1.5,
    marginBottom: 3,
  },
});

// ----- PDF Document Component -----

interface RoutePdfProps {
  stops: RouteStop[];
  stats: RouteStats;
  distances: StopDistance[];
  qrDataUrl: string;
  googleMapsUrl: string;
  generatedDate: string;
}

const RoutePdfDocument: React.FC<RoutePdfProps> = ({
  stops,
  stats,
  distances,
  qrDataUrl,
  googleMapsUrl,
  generatedDate,
}) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <Document
      title="Christmas Lights Route Guide"
      author="DFW Christmas Lights Finder"
      subject="Printable route guide for Christmas light displays"
    >
      <Page size="LETTER" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          <Svg width="100%" height="30" viewBox="0 0 540 30" style={{ position: "absolute", top: 0, left: 0, opacity: 0.15 }}>
            <Snowflake x={30} y={15} size={6} color="#ffffff" />
            <Snowflake x={90} y={8} size={4} color="#ffffff" />
            <Snowflake x={160} y={22} size={5} color="#ffffff" />
            <Snowflake x={250} y={10} size={7} color="#ffffff" />
            <Snowflake x={340} y={20} size={4} color="#ffffff" />
            <Snowflake x={420} y={12} size={6} color="#ffffff" />
            <Snowflake x={500} y={18} size={5} color="#ffffff" />
          </Svg>
          <Text style={styles.title}>Christmas Lights Route Guide</Text>
          <Text style={styles.subtitle}>
            Your personalized tour of {stats.stopCount} amazing displays
          </Text>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stopCount}</Text>
            <Text style={styles.statLabel}>Stops</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMiles}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(stats.estimatedMinutes)}</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
        </View>

        {/* QR Code section */}
        <View style={styles.qrSection}>
          {qrDataUrl ? (
            <Image src={qrDataUrl} style={styles.qrImage} />
          ) : null}
          <View style={styles.qrText}>
            <Text style={styles.qrTitle}>Open in Google Maps</Text>
            <Text style={styles.qrDescription}>
              Scan this QR code with your phone to open the full route in Google Maps with
              turn-by-turn navigation to each stop.
            </Text>
            {googleMapsUrl ? (
              <Link src={googleMapsUrl}>
                <Text style={[styles.qrDescription, { color: colors.darkGreen, marginTop: 4 }]}>
                  Or tap here to open the route
                </Text>
              </Link>
            ) : null}
          </View>
        </View>

        {/* Decorative divider */}
        <Svg width="100%" height="16" viewBox="0 0 540 16" style={{ marginBottom: 12 }}>
          <Line x1={0} y1={8} x2={220} y2={8} stroke={colors.lightGray} strokeWidth={1} />
          <Star x={270} y={8} size={7} />
          <Line x1={320} y1={8} x2={540} y2={8} stroke={colors.lightGray} strokeWidth={1} />
        </Svg>

        {/* Route stops */}
        <Text style={styles.sectionHeading}>Your Route</Text>

        {stops.map((stop, index) => {
          const isGreen = index % 2 === 0;
          const bgColor = isGreen ? colors.darkGreen : colors.richRed;

          return (
            <React.Fragment key={stop.id}>
              <View wrap={false} style={styles.stopCard}>
                <View style={[styles.stopNumberCol, { backgroundColor: bgColor }]}>
                  <Text style={styles.stopNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stopContent}>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                  {stop.description ? (
                    <Text style={styles.stopDescription}>{stop.description}</Text>
                  ) : null}
                </View>
              </View>

              {/* Distance to next stop */}
              {index < distances.length ? (
                <View style={styles.distanceBadge}>
                  <View style={styles.distanceLine} />
                  <Text style={styles.distanceText}>
                    {distances[index].miles} mi · ~{distances[index].minutes} min drive
                  </Text>
                </View>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* Tips section */}
        <View wrap={false} style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Your Drive</Text>
          <Text style={styles.tipItem}>
            • Drive slowly through residential areas — many homes have speed bumps.
          </Text>
          <Text style={styles.tipItem}>
            • Keep headlights on low beam to better see the light displays.
          </Text>
          <Text style={styles.tipItem}>
            • Bring hot cocoa and holiday music for the full experience!
          </Text>
          <Text style={styles.tipItem}>
            • Be respectful of residents — avoid blocking driveways.
          </Text>
        </View>

        {/* Fixed footer on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            DFW Christmas Lights Finder · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

// ----- Lambda Handler -----

export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate request body
    const parseResult = parseJsonBody(event.body, generatePdfSchema);
    if (!parseResult.success) {
      return validationError(parseResult.errors);
    }

    const { stops } = parseResult.data;

    if (!PHOTOS_BUCKET) {
      console.error("PHOTOS_BUCKET_NAME environment variable not set");
      return internalError();
    }

    // Calculate route statistics
    const stats = calculateRouteStats(stops);
    const distances = getStopDistances(stops);

    // Generate Google Maps URL and QR code
    const googleMapsUrl = buildGoogleMapsUrl(stops);
    let qrDataUrl = "";
    if (googleMapsUrl) {
      qrDataUrl = await generateQrDataUrl(googleMapsUrl);
    }

    const generatedDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      <RoutePdfDocument
        stops={stops}
        stats={stats}
        distances={distances}
        qrDataUrl={qrDataUrl}
        googleMapsUrl={googleMapsUrl}
        generatedDate={generatedDate}
      />
    );

    // Upload to S3
    const pdfKey = `pdfs/${uuidv4()}.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: PHOTOS_BUCKET,
        Key: pdfKey,
        Body: Buffer.from(pdfBuffer),
        ContentType: "application/pdf",
        ContentDisposition: "inline; filename=christmas-lights-route.pdf",
      })
    );

    // Generate presigned download URL
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: PHOTOS_BUCKET,
        Key: pdfKey,
      }),
      { expiresIn: PDF_EXPIRATION_SECONDS }
    );

    return successResponse({
      data: {
        downloadUrl,
        expiresIn: PDF_EXPIRATION_SECONDS,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return internalError("Failed to generate PDF route guide");
  }
}
