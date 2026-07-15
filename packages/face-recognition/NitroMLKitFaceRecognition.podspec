require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroMLKitFaceRecognition"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.source       = { :git => "https://github.com/pologonzalo/react-native-nitro-mlkit.git", :tag => s.version }

  s.platforms    = { :ios => "15.5" }

  s.source_files = [
    "ios/**/*.{swift,h,m,mm,cpp}",
    "nitrogen/generated/ios/**/*.{swift,h,m,mm,cpp}",
    "nitrogen/generated/shared/**/*.{hpp,cpp,h}"
  ]

  # ML Kit face detection + TensorFlow Lite for the embedding model.
  s.dependency "GoogleMLKit/FaceDetection", "~> 7.0"
  s.dependency "TensorFlowLiteObjC"
  s.dependency "NitroModules"

  s.pod_target_xcconfig = {
    "SWIFT_VERSION" => "5.9",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "DEFINES_MODULE" => "YES"
  }
end
