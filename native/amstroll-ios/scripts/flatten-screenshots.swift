import Foundation
import AppKit
import ImageIO
import UniformTypeIdentifiers

// Flatten actual Simulator PNG attachments without scaling or changing content.
guard CommandLine.arguments.count == 2 else { fatalError("Usage: swift flatten-screenshots.swift DIRECTORY") }
let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let enumerator = FileManager.default.enumerator(at: directory, includingPropertiesForKeys: nil)!
var count = 0
while let url = enumerator.nextObject() as? URL {
    guard url.pathExtension.lowercased() == "png",
          let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let original = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
    guard let context = CGContext(data: nil, width: original.width, height: original.height,
        bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { fatalError("Image context: \(url.path)") }
    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: original.width, height: original.height))
    context.draw(original, in: CGRect(x: 0, y: 0, width: original.width, height: original.height))
    guard let flat = context.makeImage(), let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("PNG writer: \(url.path)") }
    CGImageDestinationAddImage(destination, flat, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("PNG export: \(url.path)") }
    print("\(url.lastPathComponent): \(original.width)×\(original.height), opaque sRGB")
    count += 1
}
guard count > 0 else { fatalError("No actual PNG captures found. Do not substitute web mockups.") }
